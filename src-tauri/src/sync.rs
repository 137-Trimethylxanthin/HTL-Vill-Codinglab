use crate::error::AppResult;
use crate::history::{History, SessionRecord, MAX_PAGE};

#[derive(Debug, Default, PartialEq)]
pub struct SyncReport {
    pub pulled: usize,
    pub pushed: usize,
}

/// Another station, reachable somehow (HTTP in production, in-process in tests).
pub trait Remote {
    fn station(&self) -> &str;
    /// Records the remote has, after its own sequence number `after`.
    fn pull(&self, after: i64) -> AppResult<(Vec<SessionRecord>, i64)>;
    /// Gives records to the remote. Returns how many were new there.
    fn push(&self, records: &[SessionRecord]) -> AppResult<usize>;
}

pub const MAX_PAGES_PER_ROUND: usize = 20;

/// One sync round with one peer: pull everything new from it, then push our own new records.
/// Only records of our event are exchanged; broken or implausible records are skipped.
/// Marks are advanced only after a page was stored, so an interrupted round resumes safely;
/// a peer that never ends (or lies about progress) is cut off after MAX_PAGES_PER_ROUND pages.
pub fn sync_with(
    local: &History,
    own_station: &str,
    event: &str,
    remote: &dyn Remote,
    retention_days: u32,
    now_ms: i64,
) -> AppResult<SyncReport> {
    let peer = remote.station().to_string();
    let mut report = SyncReport::default();

    let mut after = local.mark(&peer, "pull")?;
    for _ in 0..MAX_PAGES_PER_ROUND {
        let (records, last) = remote.pull(after)?;
        if records.is_empty() || last <= after {
            break;
        }
        for r in records.iter().filter(|r| r.event == event) {
            if let Ok(true) = local.insert(r, retention_days, now_ms) {
                report.pulled += 1;
            }
        }
        local.set_mark(&peer, "pull", last)?;
        after = last;
    }

    let mut pushed_to = local.mark(&peer, "push")?;
    for _ in 0..MAX_PAGES_PER_ROUND {
        let (own, last) = local.own_after(own_station, pushed_to, MAX_PAGE)?;
        if last <= pushed_to {
            break;
        }
        let own: Vec<SessionRecord> = own.into_iter().filter(|r| r.event == event).collect();
        if !own.is_empty() {
            report.pushed += remote.push(&own)?;
        }
        local.set_mark(&peer, "push", last)?;
        pushed_to = last;
    }
    Ok(report)
}

use crate::config::StationConfig;
use crate::error::AppError;
use axum::extract::{Query, State};
use axum::http::{HeaderMap, StatusCode};
use axum::response::Html;
use axum::routing::get;
use axum::{Json, Router};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

pub const SYNC_PORT: u16 = 47800;
pub const SERVICE_TYPE: &str = "_codinglab._tcp.local.";
/// Bumped whenever the wire format changes: older builds are then refused instead of half-working.
/// 2: the swarm header carries `swarm_token`, commands are bound to their recipient.
pub const PROTOCOL: &str = "2";
/// Proves membership of the event on every request between stations; carries `swarm_token`, never the code.
pub const SWARM_HEADER: &str = "x-codinglab-event";
const ROUND: Duration = Duration::from_secs(30);
pub const MAX_PEERS: usize = 32;
/// A peer that answered a sync round this recently is never pushed out of the list by newcomers.
const TRUSTED_MS: i64 = 5 * 60_000;
/// At most this many stations per IP address (one machine must not fill the list).
const MAX_PEERS_PER_IP: usize = 4;
const PEER_EXPIRY: Duration = Duration::from_secs(600);
const STICKY_MS: i64 = 90_000;
// Records now carry flight paths (~2 KB each): a 500-record push batch must still fit.
const MAX_BODY_BYTES: usize = 2 * 1024 * 1024;
const MAX_REPLY_BYTES: u64 = 2 * 1024 * 1024;
/// A station that has not reported for this long shows as "offline" in the overview.
pub const OFFLINE_MS: i64 = 30_000;
/// One slow or dead peer must not stall the supervisor overview.
const STATUS_TIMEOUT: Duration = Duration::from_secs(2);
/// A visitor counts as stuck after this many failed runs in a row, ...
const STUCK_FAILS: u32 = 3;
/// ... this long on one mission without solving it, ...
const STUCK_MISSION_MS: i64 = 4 * 60_000;
/// ... or this long without a tap while on a mission.
const STUCK_IDLE_MS: i64 = 45_000;
const OVERVIEW_HTML: &str = include_str!("overview.html");

/// The event code is the swarm's shared secret and never leaves the station. Three values are derived
/// from it, each under its own label so none can be computed from another:
/// - `event_hash` (public: mDNS, /health) only lets stations group by event;
/// - `swarm_token` goes in SWARM_HEADER and opens /records and /status;
/// - the command key (remote.rs) signs commands, so neither of the others is enough to steer a station.
pub fn event_hash(code: &str) -> String {
    use sha2::{Digest, Sha256};
    if code.is_empty() {
        return String::new();
    }
    Sha256::digest(format!("codinglab-event:{code}").as_bytes())[..6].iter().map(|b| format!("{b:02x}")).collect()
}

/// Sent in SWARM_HEADER instead of the code. A peer that learns it can read and add records,
/// but cannot derive the code or the command key from it. Empty code, empty token.
pub fn swarm_token(code: &str) -> String {
    use sha2::{Digest, Sha256};
    if code.is_empty() {
        return String::new();
    }
    Sha256::digest(format!("codinglab-swarm:{code}").as_bytes()).iter().map(|b| format!("{b:02x}")).collect()
}

/// What the frontend last reported about this station (src/lib/session/status.ts). No visitor names.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct StationStatus {
    pub screen: String,
    pub mission_id: Option<String>,
    pub mission_title: Option<String>,
    /// When the current mission was opened (ms epoch).
    pub since: Option<i64>,
    pub last_activity: i64,
    pub runs: u32,
    /// Failed runs in a row on the current mission.
    pub fails: u32,
    pub help: bool,
    pub solved: u32,
    /// The visitor's block program, compact and opaque here (for the master's live view).
    pub program: Option<serde_json::Value>,
    pub pose: Option<Pose>,
    /// When the current visitor started (ms epoch).
    pub visit_since: Option<i64>,
    /// The master paused this station.
    pub paused: bool,
}

/// Where the drone is right now, for the master's live view.
#[derive(Debug, Clone, Copy, Default, PartialEq, Serialize, Deserialize)]
#[serde(default)]
pub struct Pose {
    pub x: f64,
    pub y: f64,
    pub heading: f64,
    pub flying: bool,
    pub carrying: bool,
}

/// A bigger program is not shown live (status rows stay small).
pub const MAX_PROGRAM_BYTES: usize = 8 * 1024;

/// Why a station shows "HÄNGT" in the overview.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum StuckReason {
    Fails,
    Long,
    Idle,
}

/// A visitor on a mission who probably needs someone: failing again and again, long on it, or not touching anything.
/// Only the mission screen counts: after solving ("complete") nobody is stuck.
fn stuck_reason(status: &StationStatus, mission_ms: Option<i64>, idle_ms: i64) -> Option<StuckReason> {
    if status.screen != "mission" {
        return None;
    }
    if status.fails >= STUCK_FAILS {
        Some(StuckReason::Fails)
    } else if mission_ms.is_some_and(|ms| ms >= STUCK_MISSION_MS) {
        Some(StuckReason::Long)
    } else if idle_ms >= STUCK_IDLE_MS {
        Some(StuckReason::Idle)
    } else {
        None
    }
}

/// One row of the supervisor overview. Durations are measured by the station itself,
/// so the stations' clocks need not agree.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct StatusView {
    pub station_id: String,
    pub station_name: String,
    #[serde(flatten)]
    pub status: StationStatus,
    /// Time since the frontend last reported.
    pub age_ms: i64,
    /// Time on the current mission.
    pub mission_ms: Option<i64>,
    /// Time since the current visitor started.
    pub visit_ms: Option<i64>,
    pub idle_ms: i64,
    pub offline: bool,
    pub stuck: bool,
    pub stuck_reason: Option<StuckReason>,
    /// The station's own clock when it built this row (ms epoch; 0 = unknown), to show clock skew.
    pub now: i64,
}

impl StatusView {
    /// Recomputed by whoever shows the row, so older peers (without the field) are flagged too.
    fn mark_stuck(&mut self) {
        self.stuck_reason = if self.offline { None } else { stuck_reason(&self.status, self.mission_ms, self.idle_ms) };
        self.stuck = self.stuck_reason.is_some();
    }
}

pub struct Shared {
    pub history: Arc<History>,
    pub config: Arc<Mutex<StationConfig>>,
    pub peers: Arc<Peers>,
    /// The latest status and when it arrived (ms epoch).
    pub status: Mutex<Option<(StationStatus, i64)>>,
    /// Where the config is saved (remote settings).
    pub dir: std::path::PathBuf,
    /// Commands from the master: replay guard and the hand-over to the frontend.
    pub inbox: crate::remote::Inbox,
}

impl Shared {
    pub(crate) fn identity(&self) -> Option<(String, String, u32, bool)> {
        let cfg = self.config.lock().ok()?;
        // Without an event code there is no secret, so the station neither serves nor syncs.
        let enabled = cfg.sync_enabled && !cfg.event_code.is_empty();
        Some((cfg.station_id.clone(), cfg.event_code.clone(), cfg.name_retention_days, enabled))
    }

    pub fn set_status(&self, mut status: StationStatus) {
        drop_big_program(&mut status);
        if let Ok(mut slot) = self.status.lock() {
            *slot = Some((status, now_ms()));
        }
    }

    /// This station's row; offline if the frontend never reported or stopped reporting.
    pub(crate) fn own_view(&self) -> StatusView {
        let (station_id, station_name) =
            self.config.lock().map(|c| (c.station_id.clone(), c.station_name.clone())).unwrap_or_default();
        let latest = self.status.lock().ok().and_then(|s| s.clone());
        let now = now_ms();
        let Some((status, at)) = latest else {
            return StatusView { station_id, station_name, offline: true, now, ..Default::default() };
        };
        let mut view = StatusView {
            station_id,
            station_name,
            age_ms: now - at,
            mission_ms: status.since.map(|t| (now - t).max(0)),
            visit_ms: status.visit_since.map(|t| (now - t).max(0)),
            now,
            idle_ms: (now - status.last_activity).max(0),
            offline: now - at > OFFLINE_MS,
            status,
            ..Default::default()
        };
        view.mark_stuck();
        view
    }
}

/// A program too big for a status row is not shown (ours or a peer's).
fn drop_big_program(status: &mut StationStatus) {
    if status.program.as_ref().is_some_and(|p| serde_json::to_vec(p).map_or(true, |b| b.len() > MAX_PROGRAM_BYTES)) {
        status.program = None;
    }
}

pub(crate) fn now_ms() -> i64 {
    chrono::Utc::now().timestamp_millis()
}

#[derive(Deserialize)]
struct AfterQuery {
    after: Option<i64>,
}

#[derive(Serialize, Deserialize)]
struct Page {
    records: Vec<SessionRecord>,
    last: i64,
}

pub(crate) fn same_swarm(shared: &Shared, headers: &HeaderMap) -> Result<u32, StatusCode> {
    let (_, event, retention, enabled) = shared.identity().ok_or(StatusCode::SERVICE_UNAVAILABLE)?;
    let header = |name: &str| headers.get(name).and_then(|v| v.to_str().ok()).unwrap_or_default().to_string();
    // Constant time: how long the check takes says nothing about how much of the token was right.
    if !enabled || header("x-codinglab-v") != PROTOCOL || !crate::remote::same_bytes(header(SWARM_HEADER).as_bytes(), swarm_token(&event).as_bytes()) {
        return Err(StatusCode::FORBIDDEN);
    }
    Ok(retention)
}

async fn health(State(shared): State<Arc<Shared>>) -> Result<Json<serde_json::Value>, StatusCode> {
    let (station, event, _, _) = shared.identity().ok_or(StatusCode::SERVICE_UNAVAILABLE)?;
    Ok(Json(serde_json::json!({ "station": station, "eh": event_hash(&event), "v": PROTOCOL })))
}

async fn get_records(
    State(shared): State<Arc<Shared>>,
    headers: HeaderMap,
    Query(q): Query<AfterQuery>,
) -> Result<Json<Page>, StatusCode> {
    same_swarm(&shared, &headers)?;
    let (records, last) = shared
        .history
        .after(q.after.unwrap_or(0), MAX_PAGE)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(Json(Page { records, last }))
}

async fn post_records(
    State(shared): State<Arc<Shared>>,
    headers: HeaderMap,
    body: Result<Json<Vec<serde_json::Value>>, axum::extract::rejection::JsonRejection>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let retention = same_swarm(&shared, &headers)?;
    let event = shared.identity().map(|(_, e, _, _)| e).unwrap_or_default();
    let Json(values) = body.map_err(|_| StatusCode::BAD_REQUEST)?;
    if values.len() > MAX_PAGE {
        return Err(StatusCode::PAYLOAD_TOO_LARGE);
    }
    let mut accepted = 0;
    for value in values {
        // One broken record must not block the others.
        let Ok(record) = serde_json::from_value::<SessionRecord>(value) else { continue };
        if record.event != event {
            continue;
        }
        if shared.history.insert(&record, retention, now_ms()).unwrap_or(false) {
            accepted += 1;
        }
    }
    Ok(Json(serde_json::json!({ "accepted": accepted })))
}

async fn get_status(State(shared): State<Arc<Shared>>, headers: HeaderMap) -> Result<Json<StatusView>, StatusCode> {
    same_swarm(&shared, &headers)?;
    Ok(Json(shared.own_view()))
}

#[derive(Deserialize)]
struct CodeQuery {
    code: Option<String>,
}

/// The overview is opened on a supervisor's phone, which knows the event code but cannot send headers.
/// Hashes are compared, so the time taken says nothing about how much of the code was right.
fn check_code(shared: &Shared, code: Option<&str>) -> Result<String, StatusCode> {
    use sha2::{Digest, Sha256};
    let (_, event, _, enabled) = shared.identity().ok_or(StatusCode::SERVICE_UNAVAILABLE)?;
    let code = code.unwrap_or_default();
    if !enabled || Sha256::digest(code.as_bytes()) != Sha256::digest(event.as_bytes()) {
        return Err(StatusCode::FORBIDDEN);
    }
    Ok(event)
}

async fn overview(State(shared): State<Arc<Shared>>, Query(q): Query<CodeQuery>) -> Result<Html<&'static str>, StatusCode> {
    check_code(&shared, q.code.as_deref())?;
    Ok(Html(OVERVIEW_HTML))
}

/// Asks a peer for its status row (blocking, short timeout).
fn status_of(address: &str, event: &str) -> Option<StatusView> {
    let reply = ureq::get(&format!("http://{address}/status"))
        .timeout(STATUS_TIMEOUT)
        .set(SWARM_HEADER, &swarm_token(event))
        .set("x-codinglab-v", PROTOCOL)
        .call()
        .ok()?;
    read_json(reply).ok()
}

/// Help first, then stuck visitors, then stations that are online, then whoever has been on their mission longest.
fn overview_order(a: &StatusView, b: &StatusView) -> std::cmp::Ordering {
    b.status.help
        .cmp(&a.status.help)
        .then(b.stuck.cmp(&a.stuck))
        .then(a.offline.cmp(&b.offline))
        .then(b.mission_ms.unwrap_or(-1).cmp(&a.mission_ms.unwrap_or(-1)))
        .then(a.station_name.cmp(&b.station_name))
}

#[cfg(test)]
fn sort_overview(rows: &mut [StatusView]) {
    rows.sort_by(overview_order);
}

/// One row of the master's fleet view: the overview row plus where the station is reached.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FleetRow {
    #[serde(flatten)]
    pub view: StatusView,
    /// Base URL of the peer (http://ip:port); empty for this station.
    pub address: String,
}

/// This station plus every peer of the event, sorted like the overview. Peers are asked at once;
/// a dead or slow one shows as offline after STATUS_TIMEOUT. Without an event code: only this station.
pub async fn fleet_rows(shared: &Shared) -> Vec<FleetRow> {
    let own = shared.own_view();
    let event = shared.identity().map(|(_, e, _, _)| e).unwrap_or_default();
    let peers = if event.is_empty() { Vec::new() } else { shared.peers.targets(&event_hash(&event)) };
    let tasks: Vec<_> = peers
        .into_iter()
        .filter(|p| p.station != own.station_id)
        .map(|peer| {
            let event = event.clone();
            tokio::task::spawn_blocking(move || {
                let view = status_of(&peer.address, &event);
                (peer, view)
            })
        })
        .collect();
    let mut rows = vec![FleetRow { view: own, address: String::new() }];
    for task in tasks {
        let Ok((peer, view)) = task.await else { continue };
        let address = format!("http://{}", peer.address);
        let view = match view {
            Some(mut v) => {
                v.offline = v.offline || v.age_ms > OFFLINE_MS;
                // A help call from a station that went quiet is stale: do not keep it on top.
                if v.offline {
                    v.status.help = false;
                }
                v.mark_stuck();
                drop_big_program(&mut v.status);
                v.station_id = peer.station;
                if v.station_name.is_empty() {
                    v.station_name = peer.name;
                }
                v
            }
            None => StatusView { station_id: peer.station, station_name: peer.name, offline: true, ..Default::default() },
        };
        rows.push(FleetRow { view, address });
    }
    rows.sort_by(|a, b| overview_order(&a.view, &b.view));
    rows
}

async fn overview_data(State(shared): State<Arc<Shared>>, Query(q): Query<CodeQuery>) -> Result<Json<serde_json::Value>, StatusCode> {
    check_code(&shared, q.code.as_deref())?;
    let rows: Vec<StatusView> = fleet_rows(&shared).await.into_iter().map(|r| r.view).collect();
    Ok(Json(serde_json::json!({ "stations": rows })))
}

/// This computer's LAN addresses, for the overview link. Connecting a UDP socket sends nothing;
/// it only asks the system which address it would use towards that network.
pub fn lan_addresses() -> Vec<String> {
    let mut found: Vec<String> = Vec::new();
    for target in ["192.168.0.1:9", "10.0.0.1:9", "172.16.0.1:9", "8.8.8.8:80"] {
        let Ok(socket) = std::net::UdpSocket::bind("0.0.0.0:0") else { continue };
        if socket.connect(target).is_err() {
            continue;
        }
        let Ok(addr) = socket.local_addr() else { continue };
        let ip = addr.ip();
        if !ip.is_loopback() && !ip.is_unspecified() && !found.contains(&ip.to_string()) {
            found.push(ip.to_string());
        }
    }
    found
}

pub fn router(shared: Arc<Shared>) -> Router {
    Router::new()
        .route("/health", get(health))
        .route("/records", get(get_records).post(post_records))
        .route("/status", get(get_status))
        .route("/overview", get(overview))
        .route("/overview/data", get(overview_data))
        .route("/command", axum::routing::post(crate::remote::receive).layer(axum::extract::DefaultBodyLimit::max(crate::remote::MAX_COMMAND_BYTES)))
        .layer(axum::extract::DefaultBodyLimit::max(MAX_BODY_BYTES))
        .with_state(shared)
}

/// A peer reached over HTTP.
pub struct HttpRemote {
    station: String,
    base_url: String,
    token: String,
    agent: ureq::Agent,
}

impl HttpRemote {
    pub fn new(station: &str, base_url: &str, event: &str) -> Self {
        Self {
            station: station.into(),
            base_url: base_url.trim_end_matches('/').into(),
            token: swarm_token(event),
            agent: ureq::AgentBuilder::new().timeout(Duration::from_secs(5)).build(),
        }
    }
}

fn net(e: impl std::fmt::Display) -> AppError {
    AppError::Other(format!("Sync: {e}"))
}

/// Replies from peers are read with a size cap (a peer must not fill our memory).
fn read_json<T: serde::de::DeserializeOwned>(reply: ureq::Response) -> AppResult<T> {
    use std::io::Read;
    serde_json::from_reader(reply.into_reader().take(MAX_REPLY_BYTES)).map_err(net)
}

impl Remote for HttpRemote {
    fn station(&self) -> &str {
        &self.station
    }

    fn pull(&self, after: i64) -> AppResult<(Vec<SessionRecord>, i64)> {
        let page = self
            .agent
            .get(&format!("{}/records", self.base_url))
            .set(SWARM_HEADER, &self.token)
            .set("x-codinglab-v", PROTOCOL)
            .query("after", &after.to_string())
            .call()
            .map_err(net)?;
        let page: Page = read_json(page)?;
        Ok((page.records, page.last))
    }

    fn push(&self, records: &[SessionRecord]) -> AppResult<usize> {
        let reply = self
            .agent
            .post(&format!("{}/records", self.base_url))
            .set(SWARM_HEADER, &self.token)
            .set("x-codinglab-v", PROTOCOL)
            .send_json(records)
            .map_err(net)?;
        let reply: serde_json::Value = read_json(reply)?;
        Ok(reply["accepted"].as_u64().unwrap_or(0) as usize)
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PeerInfo {
    pub station: String,
    pub name: String,
    pub address: String,
    pub last_seen_ms: i64,
    pub last_ok_ms: Option<i64>,
}

struct PeerEntry {
    info: PeerInfo,
    event_hash: String,
    seen_at: Instant,
}

/// Stations seen on the network (mDNS) or configured by hand. Small, self-cleaning,
/// and a peer that works is not replaced by someone else announcing the same id.
#[derive(Default)]
pub struct Peers {
    map: Mutex<HashMap<String, PeerEntry>>,
}

impl Peers {
    pub(crate) fn seen(&self, station: &str, name: &str, address: &str, event_hash: &str) {
        let Ok(mut map) = self.map.lock() else { return };
        let now = Instant::now();
        map.retain(|_, e| now.duration_since(e.seen_at) < PEER_EXPIRY);
        if let Some(entry) = map.get_mut(station) {
            let working = entry.info.last_ok_ms.is_some_and(|t| now_ms() - t < STICKY_MS);
            if working && entry.info.address != address {
                return;
            }
            entry.info.name = name.into();
            entry.info.address = address.into();
            entry.info.last_seen_ms = now_ms();
            entry.event_hash = event_hash.into();
            entry.seen_at = now;
            return;
        }
        // Room is made by dropping the stalest entry that did not answer lately (never-answered first);
        // a station that works is never pushed out, however many newcomers announce themselves.
        let ip = |a: &str| a.rsplit_once(':').map_or(a, |(host, _)| host).to_string();
        let new_ip = ip(address);
        let now_wall = now_ms();
        let victim = |map: &HashMap<String, PeerEntry>, same_ip: bool| {
            map.iter()
                .filter(|(_, e)| !same_ip || ip(&e.info.address) == new_ip)
                .filter(|(_, e)| !e.info.last_ok_ms.is_some_and(|t| now_wall - t < TRUSTED_MS))
                .min_by_key(|(_, e)| (e.info.last_ok_ms.is_some(), e.seen_at))
                .map(|(k, _)| k.clone())
        };
        if map.values().filter(|e| ip(&e.info.address) == new_ip).count() >= MAX_PEERS_PER_IP {
            let Some(key) = victim(&map, true) else { return };
            map.remove(&key);
        }
        if map.len() >= MAX_PEERS {
            let Some(key) = victim(&map, false) else { return };
            map.remove(&key);
        }
        map.insert(
            station.into(),
            PeerEntry {
                info: PeerInfo { station: station.into(), name: name.into(), address: address.into(), last_seen_ms: now_ms(), last_ok_ms: None },
                event_hash: event_hash.into(),
                seen_at: now,
            },
        );
    }

    fn ok(&self, station: &str) {
        if let Ok(mut map) = self.map.lock()
            && let Some(entry) = map.get_mut(station)
        {
            entry.info.last_ok_ms = Some(now_ms());
        }
    }

    pub fn list(&self) -> Vec<PeerInfo> {
        let now = Instant::now();
        self.map
            .lock()
            .map(|m| m.values().filter(|e| now.duration_since(e.seen_at) < PEER_EXPIRY).map(|e| e.info.clone()).collect())
            .unwrap_or_default()
    }

    pub(crate) fn targets(&self, event_hash: &str) -> Vec<PeerInfo> {
        let now = Instant::now();
        self.map
            .lock()
            .map(|m| {
                m.values()
                    .filter(|e| e.event_hash == event_hash && now.duration_since(e.seen_at) < PEER_EXPIRY)
                    .map(|e| e.info.clone())
                    .collect()
            })
            .unwrap_or_default()
    }
}

/// Asks a peer who it is. Used before trusting an address announced via mDNS.
fn health_of(base: &str) -> Option<(String, String)> {
    let reply = ureq::get(&format!("http://{base}/health")).timeout(Duration::from_secs(3)).call().ok()?;
    let body: serde_json::Value = read_json(reply).ok()?;
    if body["v"] != PROTOCOL {
        return None;
    }
    Some((body["station"].as_str()?.to_string(), body["eh"].as_str().unwrap_or_default().to_string()))
}

/// One round: sync with every known peer of our event. Errors stay per peer.
fn round(shared: &Shared, peers: &Peers) {
    let Some((station, event, retention, enabled)) = shared.identity() else { return };
    let _ = shared.history.redact_older_than(retention, now_ms());
    if !enabled {
        return;
    }
    let hash = event_hash(&event);
    let manual = shared.config.lock().map(|c| c.manual_peers.clone()).unwrap_or_default();
    for address in manual {
        let base = if address.contains(':') { address.clone() } else { format!("{address}:{SYNC_PORT}") };
        if let Some((peer, peer_hash)) = health_of(&base)
            && !peer.is_empty()
            && peer != station
        {
            peers.seen(&peer, &base, &base, &peer_hash);
        }
    }
    for peer in peers.targets(&hash) {
        if peer.station == station {
            continue;
        }
        let remote = HttpRemote::new(&peer.station, &format!("http://{}", peer.address), &event);
        if sync_with(&shared.history, &station, &event, &remote, retention, now_ms()).is_ok() {
            peers.ok(&peer.station);
        }
    }
}

/// Announces this station (desktop only). Returns the registered name and event hash.
fn register(daemon: &mdns_sd::ServiceDaemon, shared: &Shared) -> Option<(String, String)> {
    let (station, event, _, enabled) = shared.identity()?;
    let hash = event_hash(&event);
    if !cfg!(desktop) || !enabled {
        return Some((String::new(), hash));
    }
    let name = shared.config.lock().map(|c| c.station_name.clone()).unwrap_or_default();
    let short: String = station.chars().filter(char::is_ascii_alphanumeric).take(8).collect();
    let host = format!("codinglab-{short}.local.");
    let props = [("station", station.as_str()), ("eh", hash.as_str()), ("v", PROTOCOL), ("name", name.as_str())];
    let info = mdns_sd::ServiceInfo::new(SERVICE_TYPE, &station, &host, "", SYNC_PORT, &props[..]).ok()?.enable_addr_auto();
    let fullname = info.get_fullname().to_string();
    daemon.register(info).ok()?;
    Some((fullname, hash))
}

fn discover(peers: Arc<Peers>) -> Result<mdns_sd::ServiceDaemon, mdns_sd::Error> {
    let daemon = mdns_sd::ServiceDaemon::new()?;
    let receiver = daemon.browse(SERVICE_TYPE)?;
    std::thread::spawn(move || {
        while let Ok(event) = receiver.recv() {
            let mdns_sd::ServiceEvent::ServiceResolved(info) = event else { continue };
            let station = info.get_property_val_str("station").unwrap_or_default().to_string();
            let name = info.get_property_val_str("name").unwrap_or_default().to_string();
            if station.is_empty() || info.get_property_val_str("v") != Some(PROTOCOL) {
                continue;
            }
            let Some(ip) = info.addresses.iter().map(|a| a.to_ip_addr()).find(|ip| ip.is_ipv4()) else { continue };
            let address = format!("{ip}:{}", info.port);
            // Trust the address only if the station there confirms the announced id.
            if let Some((confirmed, hash)) = health_of(&address)
                && confirmed == station
            {
                peers.seen(&station, &name, &address, &hash);
            }
        }
    });
    Ok(daemon)
}

/// Starts serving (desktop), discovery and the sync loop. Nothing here may stop the app.
pub fn start(shared: Arc<Shared>) -> Arc<Peers> {
    let peers = shared.peers.clone();

    #[cfg(desktop)]
    {
        let server_shared = shared.clone();
        tauri::async_runtime::spawn(async move {
            match tokio::net::TcpListener::bind(("0.0.0.0", SYNC_PORT)).await {
                Ok(listener) => {
                    if let Err(e) = axum::serve(listener, router(server_shared)).await {
                        eprintln!("sync server stopped: {e}");
                    }
                }
                Err(e) => eprintln!("sync server not started: {e}"),
            }
        });
    }

    let daemon = discover(peers.clone()).map_err(|e| eprintln!("mDNS not available: {e}")).ok();
    let loop_peers = peers.clone();
    std::thread::spawn(move || {
        let mut registered: Option<(String, String)> = daemon.as_ref().and_then(|d| register(d, &shared));
        let mut next = Instant::now();
        loop {
            if Instant::now() >= next {
                // A new event code in admin is announced without a restart.
                if let Some(d) = daemon.as_ref() {
                    let hash = shared.identity().map(|(_, e, _, _)| event_hash(&e)).unwrap_or_default();
                    if registered.as_ref().map(|(_, h)| h) != Some(&hash) {
                        if let Some((name, _)) = registered.take().filter(|(n, _)| !n.is_empty()) {
                            let _ = d.unregister(&name);
                        }
                        registered = register(d, &shared);
                    }
                }
                round(&shared, &loop_peers);
                next = Instant::now() + ROUND;
            }
            std::thread::sleep(Duration::from_secs(1));
        }
    });
    peers
}

#[cfg(test)]
pub(crate) mod tests {
    use super::*;
    use crate::history::tests::record;

    const NOW: &str = "2026-10-10T12:00:00.000Z";
    fn now_ms() -> i64 {
        chrono::DateTime::parse_from_rfc3339(NOW).unwrap().timestamp_millis()
    }

    /// A peer in the same process.
    struct Local<'a> {
        id: &'a str,
        history: &'a History,
    }

    impl Remote for Local<'_> {
        fn station(&self) -> &str {
            self.id
        }
        fn pull(&self, after: i64) -> AppResult<(Vec<SessionRecord>, i64)> {
            self.history.after(after, MAX_PAGE)
        }
        fn push(&self, records: &[SessionRecord]) -> AppResult<usize> {
            let mut n = 0;
            for r in records {
                if self.history.insert(r, 7, now_ms())? {
                    n += 1;
                }
            }
            Ok(n)
        }
    }

    fn ids(h: &History) -> Vec<String> {
        let mut v: Vec<String> = h.all().unwrap().into_iter().map(|r| r.id).collect();
        v.sort();
        v
    }

    #[test]
    fn exchanges_records_both_ways() {
        let a = History::in_memory().unwrap();
        let b = History::in_memory().unwrap();
        a.insert(&record("a1", "A", NOW, None), 7, now_ms()).unwrap();
        b.insert(&record("b1", "B", NOW, None), 7, now_ms()).unwrap();
        let report = sync_with(&a, "A", "", &Local { id: "B", history: &b }, 7, now_ms()).unwrap();
        assert_eq!(report, SyncReport { pulled: 1, pushed: 1 });
        assert_eq!(ids(&a), vec!["a1", "b1"]);
        assert_eq!(ids(&b), vec!["a1", "b1"]);
    }

    #[test]
    fn does_nothing_the_second_time() {
        let a = History::in_memory().unwrap();
        let b = History::in_memory().unwrap();
        a.insert(&record("a1", "A", NOW, None), 7, now_ms()).unwrap();
        sync_with(&a, "A", "", &Local { id: "B", history: &b }, 7, now_ms()).unwrap();
        let again = sync_with(&a, "A", "", &Local { id: "B", history: &b }, 7, now_ms()).unwrap();
        assert_eq!(again, SyncReport::default());
    }

    #[test]
    fn relays_through_a_peer() {
        let a = History::in_memory().unwrap();
        let b = History::in_memory().unwrap();
        let c = History::in_memory().unwrap();
        c.insert(&record("c1", "C", NOW, None), 7, now_ms()).unwrap();
        sync_with(&b, "B", "", &Local { id: "C", history: &c }, 7, now_ms()).unwrap();
        sync_with(&a, "A", "", &Local { id: "B", history: &b }, 7, now_ms()).unwrap();
        assert_eq!(ids(&a), vec!["c1"]);
    }

    #[test]
    fn catches_up_after_being_offline() {
        let a = History::in_memory().unwrap();
        let b = History::in_memory().unwrap();
        sync_with(&a, "A", "", &Local { id: "B", history: &b }, 7, now_ms()).unwrap();
        // offline: both collect visitors
        for i in 0..3 {
            a.insert(&record(&format!("a{i}"), "A", NOW, None), 7, now_ms()).unwrap();
            b.insert(&record(&format!("b{i}"), "B", NOW, None), 7, now_ms()).unwrap();
        }
        sync_with(&a, "A", "", &Local { id: "B", history: &b }, 7, now_ms()).unwrap();
        assert_eq!(ids(&a).len(), 6);
        assert_eq!(ids(&b).len(), 6);
        assert_eq!(a.count().unwrap(), 6);
    }

    #[test]
    fn pages_through_large_backlogs() {
        let a = History::in_memory().unwrap();
        let b = History::in_memory().unwrap();
        for i in 0..(MAX_PAGE + 20) {
            b.insert(&record(&format!("b{i:04}"), "B", NOW, None), 7, now_ms()).unwrap();
        }
        let report = sync_with(&a, "A", "", &Local { id: "B", history: &b }, 7, now_ms()).unwrap();
        assert_eq!(report.pulled, MAX_PAGE + 20);
    }

    #[test]
    fn does_not_push_records_of_other_stations() {
        let a = History::in_memory().unwrap();
        let b = History::in_memory().unwrap();
        a.insert(&record("c1", "C", NOW, None), 7, now_ms()).unwrap();
        let report = sync_with(&a, "A", "", &Local { id: "B", history: &b }, 7, now_ms()).unwrap();
        assert_eq!(report.pushed, 0);
    }
    use crate::config::StationConfig;
    use std::sync::{Arc, Mutex};

    pub(crate) fn shared(event: &str) -> Arc<Shared> {
        let cfg = StationConfig { event_code: event.into(), ..Default::default() };
        Arc::new(Shared {
            history: Arc::new(History::in_memory().unwrap()),
            config: Arc::new(Mutex::new(cfg)),
            peers: Arc::new(Peers::default()),
            status: Mutex::new(None),
            dir: std::env::temp_dir().join(format!("codinglab-test-{}", uuid::Uuid::new_v4())),
            inbox: Default::default(),
        })
    }

    pub(crate) async fn serve(s: Arc<Shared>) -> String {
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let addr = listener.local_addr().unwrap();
        tokio::spawn(async move { axum::serve(listener, router(s)).await.unwrap() });
        format!("http://{addr}")
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn syncs_over_http() {
        let server = shared("TDOT");
        // The server checks timestamps against the real clock.
        let real_now = chrono::Utc::now().to_rfc3339();
        let mut s1 = record("s1", "SERVER", &real_now, Some("Lea"));
        s1.event = "TDOT".into();
        server.history.insert(&s1, 7, chrono::Utc::now().timestamp_millis()).unwrap();
        let url = serve(server.clone()).await;
        let client = History::in_memory().unwrap();
        let mut c1 = record("c1", "CLIENT", &real_now, None);
        c1.event = "TDOT".into();
        client.insert(&c1, 7, chrono::Utc::now().timestamp_millis()).unwrap();
        let report = tokio::task::spawn_blocking(move || {
            let remote = HttpRemote::new("SERVER", &url, "TDOT");
            let r = sync_with(&client, "CLIENT", "TDOT", &remote, 7, chrono::Utc::now().timestamp_millis()).unwrap();
            (r, client.count().unwrap())
        })
        .await
        .unwrap();
        assert_eq!(report.0, SyncReport { pulled: 1, pushed: 1 });
        assert_eq!(report.1, 2);
        assert_eq!(server.history.count().unwrap(), 2);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn rejects_other_events() {
        let url = serve(shared("TDOT")).await;
        let status = tokio::task::spawn_blocking(move || {
            let remote = HttpRemote::new("SERVER", &url, "OTHER");
            remote.pull(0).err().map(|e| e.to_string())
        })
        .await
        .unwrap();
        assert!(status.unwrap_or_default().contains("403"));
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn rejects_bad_bodies() {
        let url = serve(shared("TDOT")).await;
        let (bad, too_many) = tokio::task::spawn_blocking(move || {
            let bad = ureq::post(&format!("{url}/records"))
                .set(SWARM_HEADER, &swarm_token("TDOT"))
                .set("x-codinglab-v", PROTOCOL)
                .set("content-type", "application/json")
                .send_string("{ nope");
            let many: Vec<SessionRecord> = (0..(MAX_PAGE + 1)).map(|i| record(&format!("r{i}"), "X", NOW, None)).collect();
            let too_many = ureq::post(&format!("{url}/records"))
                .set(SWARM_HEADER, &swarm_token("TDOT"))
                .set("x-codinglab-v", PROTOCOL)
                .send_json(&many);
            (bad.err().map(|e| e.to_string()), too_many.err().map(|e| e.to_string()))
        })
        .await
        .unwrap();
        assert!(bad.is_some_and(|e| e.contains("400") || e.contains("422")));
        assert!(too_many.is_some_and(|e| e.contains("413")));
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn health_reports_identity() {
        let s = shared("TDOT");
        let station = s.config.lock().unwrap().station_id.clone();
        let url = serve(s).await;
        let body: serde_json::Value = tokio::task::spawn_blocking(move || {
            ureq::get(&format!("{url}/health")).call().unwrap().into_json().unwrap()
        })
        .await
        .unwrap();
        assert_eq!(body["station"], station.as_str());
        assert!(body.get("event").is_none(), "the event code must not be public");
        assert_eq!(body["eh"], event_hash("TDOT").as_str());
        assert_eq!(body["v"], PROTOCOL);
    }

    struct Stalling;
    impl Remote for Stalling {
        fn station(&self) -> &str {
            "EVIL"
        }
        fn pull(&self, after: i64) -> AppResult<(Vec<SessionRecord>, i64)> {
            Ok((vec![], after + 1))
        }
        fn push(&self, _records: &[SessionRecord]) -> AppResult<usize> {
            Ok(0)
        }
    }

    #[test]
    fn stops_on_a_stalling_peer() {
        let a = History::in_memory().unwrap();
        let report = sync_with(&a, "A", "", &Stalling, 7, now_ms()).unwrap();
        assert_eq!(report, SyncReport::default());
        assert_eq!(a.mark("EVIL", "pull").unwrap(), 0);
    }

    #[test]
    fn skips_bad_records_and_other_events() {
        let a = History::in_memory().unwrap();
        let b = History::in_memory().unwrap();
        b.insert(&record("good", "B", NOW, None), 7, now_ms()).unwrap();
        let mut other = record("other-event", "B", NOW, None);
        other.event = "ELSEWHERE".into();
        b.insert(&other, 7, now_ms()).unwrap();
        let report = sync_with(&a, "A", "", &Local { id: "B", history: &b }, 7, now_ms()).unwrap();
        assert_eq!(report.pulled, 1);
        assert_eq!(ids(&a), vec!["good"]);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn refuses_to_serve_without_an_event_code() {
        let url = serve(shared("")).await;
        let err = tokio::task::spawn_blocking(move || HttpRemote::new("S", &url, "").pull(0).err().map(|e| e.to_string()))
            .await
            .unwrap();
        assert!(err.unwrap_or_default().contains("403"));
    }

    #[test]
    fn a_stranger_cannot_take_over_a_working_peer() {
        let peers = Peers::default();
        peers.seen("B", "Halle", "10.0.0.2:47800", "h");
        peers.ok("B");
        peers.seen("B", "fake", "10.0.0.66:47800", "h");
        assert_eq!(peers.list()[0].address, "10.0.0.2:47800");
    }

    #[test]
    fn keeps_the_peer_list_small() {
        let peers = Peers::default();
        for i in 0..100 {
            peers.seen(&format!("s{i}"), "", &format!("10.0.0.{i}:47800"), "h");
        }
        assert_eq!(peers.list().len(), MAX_PEERS);
    }

    fn status(screen: &str, help: bool) -> StationStatus {
        StationStatus { screen: screen.into(), help, last_activity: chrono::Utc::now().timestamp_millis(), ..Default::default() }
    }

    fn get(url: &str, event: Option<&str>) -> Result<ureq::Response, String> {
        let mut req = ureq::get(url);
        if let Some(event) = event {
            req = req.set(SWARM_HEADER, &swarm_token(event)).set("x-codinglab-v", PROTOCOL);
        }
        req.call().map_err(|e| e.to_string())
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn status_is_only_for_the_swarm() {
        let s = shared("TDOT");
        s.set_status(StationStatus { mission_id: Some("2.1".into()), since: Some(chrono::Utc::now().timestamp_millis() - 120_000), ..status("mission", true) });
        let url = serve(s).await;
        let (stranger, member) = tokio::task::spawn_blocking(move || {
            let stranger = get(&format!("{url}/status"), None).err();
            let member: serde_json::Value = get(&format!("{url}/status"), Some("TDOT")).unwrap().into_json().unwrap();
            (stranger, member)
        })
        .await
        .unwrap();
        assert!(stranger.unwrap_or_default().contains("403"));
        assert_eq!(member["missionId"], "2.1");
        assert_eq!(member["help"], true);
        assert_eq!(member["offline"], false);
        assert!(member["missionMs"].as_i64().unwrap() >= 120_000);
        assert!(member.get("pilotName").is_none());
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn overview_needs_the_event_code() {
        let url = serve(shared("TDOT")).await;
        let empty = serve(shared("")).await;
        let (wrong, missing, data, right, unset) = tokio::task::spawn_blocking(move || {
            (
                get(&format!("{url}/overview?code=WRONG"), None).err(),
                get(&format!("{url}/overview"), None).err(),
                get(&format!("{url}/overview/data?code=TDOTX"), None).err(),
                get(&format!("{url}/overview?code=TDOT"), None).unwrap().into_string().unwrap(),
                get(&format!("{empty}/overview/data?code="), None).err(),
            )
        })
        .await
        .unwrap();
        for err in [wrong, missing, data, unset] {
            assert!(err.unwrap_or_default().contains("403"));
        }
        assert!(right.contains("/overview/data"));
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn overview_lists_the_swarm_and_survives_dead_peers() {
        let a = shared("TDOT");
        let b = shared("TDOT");
        a.set_status(status("attract", false));
        b.set_status(StationStatus { mission_id: Some("1.2".into()), mission_title: Some("Um die Ecke".into()), runs: 4, ..status("mission", true) });
        b.config.lock().unwrap().station_name = "Halle B".into();
        let b_addr = serve(b.clone()).await.trim_start_matches("http://").to_string();
        // A station that accepts connections but never answers.
        let stalling = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
        let stalling_addr = stalling.local_addr().unwrap().to_string();
        let hash = event_hash("TDOT");
        a.peers.seen("B", "b", &b_addr, &hash);
        a.peers.seen("C", "Halle C", "127.0.0.1:1", &hash);
        a.peers.seen("D", "Halle D", &stalling_addr, &hash);
        a.peers.seen("E", "fremd", "127.0.0.1:1", &event_hash("OTHER"));
        let a_id = a.config.lock().unwrap().station_id.clone();
        let url = serve(a).await;
        let started = Instant::now();
        let body: serde_json::Value = tokio::task::spawn_blocking(move || get(&format!("{url}/overview/data?code=TDOT"), None).unwrap().into_json().unwrap())
            .await
            .unwrap();
        assert!(started.elapsed() < STATUS_TIMEOUT * 2, "peers are asked at the same time");
        let rows = body["stations"].as_array().unwrap();
        let ids: Vec<&str> = rows.iter().map(|r| r["stationId"].as_str().unwrap()).collect();
        assert_eq!(rows.len(), 4, "other events are not listed: {ids:?}");
        assert_eq!(rows[0]["stationName"], "Halle B", "help comes first");
        assert_eq!(rows[0]["stationId"], "B");
        assert_eq!(rows[0]["runs"], 4);
        assert_eq!(rows[1]["stationId"], a_id.as_str());
        assert_eq!(rows[1]["offline"], false);
        for row in &rows[2..] {
            assert_eq!(row["offline"], true, "{row}");
        }
        drop(stalling);
    }

    #[test]
    fn a_silent_frontend_shows_as_offline() {
        let s = shared("TDOT");
        *s.status.lock().unwrap() = Some((status("mission", false), chrono::Utc::now().timestamp_millis() - OFFLINE_MS - 1));
        assert!(s.own_view().offline);
        assert!(shared("TDOT").own_view().offline, "never reported");
        s.set_status(status("mission", false));
        assert!(!s.own_view().offline);
    }

    #[test]
    fn sorts_help_first_then_stuck_then_longest_on_a_mission() {
        let row = |name: &str, help: bool, offline: bool, mission_ms: Option<i64>| StatusView {
            station_name: name.into(),
            status: StationStatus { help, ..Default::default() },
            offline,
            mission_ms,
            ..Default::default()
        };
        let mut rows = vec![
            row("idle", false, false, None),
            row("short", false, false, Some(60_000)),
            row("gone", false, true, None),
            row("help", true, false, Some(1_000)),
            StatusView { stuck: true, ..row("stuck", false, false, Some(30_000)) },
            row("long", false, false, Some(600_000)),
        ];
        sort_overview(&mut rows);
        let names: Vec<&str> = rows.iter().map(|r| r.station_name.as_str()).collect();
        assert_eq!(names, vec!["help", "stuck", "long", "short", "idle", "gone"]);
    }

    #[test]
    fn flags_a_visitor_who_is_stuck_on_a_mission() {
        let on = |fails: u32| StationStatus { fails, ..status("mission", false) };
        assert_eq!(stuck_reason(&on(3), Some(10_000), 0), Some(StuckReason::Fails));
        assert_eq!(stuck_reason(&on(2), Some(10_000), 0), None, "two misses are normal");
        assert_eq!(stuck_reason(&on(0), Some(STUCK_MISSION_MS), 0), Some(StuckReason::Long));
        assert_eq!(stuck_reason(&on(0), Some(STUCK_MISSION_MS - 1), 0), None);
        assert_eq!(stuck_reason(&on(0), Some(10_000), STUCK_IDLE_MS), Some(StuckReason::Idle));
        assert_eq!(stuck_reason(&on(0), Some(10_000), STUCK_IDLE_MS - 1), None);
        assert_eq!(stuck_reason(&on(5), Some(STUCK_MISSION_MS), STUCK_IDLE_MS), Some(StuckReason::Fails), "the clearest reason wins");
        // Solved, on the map or waiting for a visitor: nobody to help, however long it takes.
        for screen in ["complete", "map", "attract"] {
            let s = StationStatus { fails: 5, ..status(screen, false) };
            assert_eq!(stuck_reason(&s, Some(STUCK_MISSION_MS * 2), STUCK_IDLE_MS * 2), None, "{screen}");
        }
    }

    #[test]
    fn own_row_says_stuck_and_offline_rows_never_do() {
        let s = shared("TDOT");
        let long_ago = chrono::Utc::now().timestamp_millis() - STUCK_MISSION_MS - 1_000;
        s.set_status(StationStatus { since: Some(long_ago), ..status("mission", false) });
        let view = s.own_view();
        assert!(view.stuck);
        assert_eq!(view.stuck_reason, Some(StuckReason::Long));
        let json = serde_json::to_value(&view).unwrap();
        assert_eq!(json["stuck"], true);
        assert_eq!(json["stuckReason"], "long");
        let mut gone = StatusView { offline: true, ..view };
        gone.mark_stuck();
        assert!(!gone.stuck);
        assert_eq!(gone.stuck_reason, None);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn fleet_has_this_station_a_live_peer_and_a_dead_one() {
        let a = shared("TDOT");
        let b = shared("TDOT");
        a.set_status(status("attract", false));
        let pose = Pose { x: 2.0, y: 3.0, heading: 90.0, flying: true, carrying: false };
        b.set_status(StationStatus { program: Some(serde_json::json!(["takeoff", "forward"])), pose: Some(pose), visit_since: Some(1), paused: true, ..status("mission", false) });
        let b_addr = serve(b).await.trim_start_matches("http://").to_string();
        let hash = event_hash("TDOT");
        a.peers.seen("B", "Halle B", &b_addr, &hash);
        a.peers.seen("C", "Halle C", "127.0.0.1:1", &hash);
        a.peers.seen("E", "fremd", "127.0.0.1:1", &event_hash("OTHER"));
        let a_id = a.config.lock().unwrap().station_id.clone();
        let rows = fleet_rows(&a).await;
        let find = |id: &str| rows.iter().find(|r| r.view.station_id == id).unwrap_or_else(|| panic!("{id} missing: {rows:?}"));
        assert_eq!(rows.len(), 3);
        assert_eq!(find(&a_id).address, "");
        assert!(!find(&a_id).view.offline);
        let live = serde_json::to_value(find("B")).unwrap();
        assert_eq!(live["address"], format!("http://{b_addr}"));
        assert_eq!(live["offline"], false);
        assert_eq!(live["program"], serde_json::json!(["takeoff", "forward"]));
        assert_eq!(live["pose"]["heading"], 90.0);
        assert_eq!(live["pose"]["flying"], true);
        assert_eq!(live["visitSince"], 1);
        assert_eq!(live["paused"], true);
        assert!(find("C").view.offline);
        assert_eq!(find("C").address, "http://127.0.0.1:1");
        // Without an event code the fleet is just this station.
        let alone = shared("");
        alone.peers.seen("B", "Halle B", &b_addr, &event_hash(""));
        assert_eq!(fleet_rows(&alone).await.len(), 1);
    }

    #[test]
    fn drops_a_program_that_is_too_big() {
        let s = shared("TDOT");
        let big = serde_json::json!("x".repeat(MAX_PROGRAM_BYTES));
        s.set_status(StationStatus { program: Some(big), paused: true, ..status("mission", false) });
        let view = s.own_view();
        assert_eq!(view.status.program, None);
        assert!(view.status.paused, "the rest of the status stays");
        s.set_status(StationStatus { program: Some(serde_json::json!({ "b": [1, 2] })), ..status("mission", false) });
        assert!(s.own_view().status.program.is_some());
        let old: StationStatus = serde_json::from_str(r#"{"screen":"map","lastActivity":1}"#).unwrap();
        assert_eq!((old.program, old.pose, old.visit_since, old.paused), (None, None, None, false));
    }

    #[test]
    fn derived_values_are_distinct() {
        let token = swarm_token("TDOT");
        assert_eq!(token.len(), 64);
        assert!(!token.contains("TDOT"));
        assert_ne!(token, event_hash("TDOT"));
        assert!(!token.starts_with(&event_hash("TDOT")), "not just a longer event hash");
        assert_ne!(token, crate::remote::sign("TDOT", b""), "not the command key's output either");
        assert_ne!(token, swarm_token("OTHER"));
        assert_eq!(swarm_token(""), "");
    }

    /// Records what a peer sends in the swarm header.
    async fn header_spy() -> (String, Arc<Mutex<Vec<String>>>) {
        let seen = Arc::new(Mutex::new(Vec::new()));
        let sink = seen.clone();
        let app = Router::new().fallback(move |headers: HeaderMap| {
            let sink = sink.clone();
            async move {
                for (name, value) in &headers {
                    sink.lock().unwrap().push(format!("{name}: {}", value.to_str().unwrap_or_default()));
                }
                StatusCode::FORBIDDEN
            }
        });
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let addr = listener.local_addr().unwrap().to_string();
        tokio::spawn(async move { axum::serve(listener, app).await.unwrap() });
        (addr, seen)
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn the_event_code_never_goes_over_the_wire() {
        let (addr, seen) = header_spy().await;
        let a = shared("GEHEIM-TDOT");
        a.peers.seen("B", "spy", &addr, &event_hash("GEHEIM-TDOT"));
        fleet_rows(&a).await;
        let base = format!("http://{addr}");
        tokio::task::spawn_blocking(move || {
            let remote = HttpRemote::new("B", &base, "GEHEIM-TDOT");
            let _ = remote.pull(0);
            let _ = remote.push(&[]);
        })
        .await
        .unwrap();
        let seen = seen.lock().unwrap();
        assert!(seen.len() > 3, "{seen:?}");
        assert!(seen.iter().all(|h| !h.contains("GEHEIM")), "{seen:?}");
        let token = format!("{SWARM_HEADER}: {}", swarm_token("GEHEIM-TDOT"));
        assert_eq!(seen.iter().filter(|h| **h == token).count(), 3, "status, pull and push carry the token");
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn the_raw_code_or_an_old_build_is_refused() {
        let url = serve(shared("TDOT")).await;
        let codes = tokio::task::spawn_blocking(move || {
            let status = |event: &str, v: &str| match ureq::get(&format!("{url}/status")).set(SWARM_HEADER, event).set("x-codinglab-v", v).call() {
                Ok(r) => r.status(),
                Err(ureq::Error::Status(code, _)) => code,
                Err(e) => panic!("{e}"),
            };
            [status("TDOT", PROTOCOL), status("TDOT", "1"), status(&swarm_token("TDOT"), "1"), status(&event_hash("TDOT"), PROTOCOL), status(&swarm_token("TDOT"), PROTOCOL)]
        })
        .await
        .unwrap();
        assert_eq!(codes, [403, 403, 403, 403, 200]);
    }

    #[test]
    fn rogue_announcements_cannot_push_out_working_peers() {
        let peers = Peers::default();
        for i in 0..MAX_PEERS {
            peers.seen(&format!("real{i}"), "", &format!("10.0.0.{i}:47800"), "h");
            if i % 2 == 0 {
                peers.ok(&format!("real{i}"));
            }
        }
        // Many rogue machines, each announcing many ids.
        for m in 0..20 {
            for i in 0..10 {
                peers.seen(&format!("rogue{m}-{i}"), "", &format!("10.6.6.{m}:{}", 47800 + i), "h");
            }
        }
        let list = peers.list();
        assert_eq!(list.len(), MAX_PEERS);
        for i in (0..MAX_PEERS).step_by(2) {
            assert!(list.iter().any(|p| p.station == format!("real{i}")), "working real{i} was pushed out");
        }
        for m in 0..20 {
            let from_one = list.iter().filter(|p| p.address.starts_with(&format!("10.6.6.{m}:"))).count();
            assert!(from_one <= MAX_PEERS_PER_IP, "{from_one} entries from one machine");
        }
        // Once every entry works, a newcomer is not taken in at all.
        let full = Peers::default();
        for i in 0..MAX_PEERS {
            full.seen(&format!("s{i}"), "", &format!("10.0.1.{i}:47800"), "h");
            full.ok(&format!("s{i}"));
        }
        full.seen("late", "", "10.0.2.1:47800", "h");
        assert!(full.list().iter().all(|p| p.station != "late"));
    }

    #[test]
    fn one_machine_gets_a_few_entries_at_most() {
        let peers = Peers::default();
        for i in 0..10 {
            peers.seen(&format!("s{i}"), "", &format!("10.0.0.9:{}", 47800 + i), "h");
        }
        let list = peers.list();
        assert_eq!(list.len(), MAX_PEERS_PER_IP);
        assert!(list.iter().any(|p| p.station == "s9"), "the newest is kept, the stalest goes");
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn fleet_drops_a_peers_oversized_program_and_keeps_its_clock() {
        let a = shared("TDOT");
        let b = shared("TDOT");
        let now = chrono::Utc::now().timestamp_millis();
        // Written past set_status, like a peer that does not check the size itself.
        let big = StationStatus { program: Some(serde_json::json!("x".repeat(MAX_PROGRAM_BYTES))), visit_since: Some(now - 60_000), ..status("mission", false) };
        *b.status.lock().unwrap() = Some((big, now));
        let b_addr = serve(b).await.trim_start_matches("http://").to_string();
        a.peers.seen("B", "Halle B", &b_addr, &event_hash("TDOT"));
        let rows = fleet_rows(&a).await;
        let row = rows.iter().find(|r| r.view.station_id == "B").unwrap();
        assert_eq!(row.view.status.program, None);
        assert!(row.view.visit_ms.is_some_and(|ms| ms >= 60_000), "{:?}", row.view.visit_ms);
        assert!((row.view.now - now).abs() < 10_000, "the peer's own clock");
        let json = serde_json::to_value(row).unwrap();
        assert!(json["visitMs"].is_i64() && json["now"].is_i64());
    }
}
