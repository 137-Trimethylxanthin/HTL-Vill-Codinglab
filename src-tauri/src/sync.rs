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
use axum::routing::get;
use axum::{Json, Router};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

pub const SYNC_PORT: u16 = 47800;
pub const SERVICE_TYPE: &str = "_codinglab._tcp.local.";
pub const PROTOCOL: &str = "1";
const ROUND: Duration = Duration::from_secs(30);
pub const MAX_PEERS: usize = 32;
const PEER_EXPIRY: Duration = Duration::from_secs(600);
const STICKY_MS: i64 = 90_000;
const MAX_BODY_BYTES: usize = 256 * 1024;
const MAX_REPLY_BYTES: u64 = 2 * 1024 * 1024;

/// The event code is the swarm's shared secret: it is never sent in the clear.
/// mDNS and /health only carry this short hash so stations can group by event.
pub fn event_hash(code: &str) -> String {
    use sha2::{Digest, Sha256};
    if code.is_empty() {
        return String::new();
    }
    Sha256::digest(format!("codinglab-event:{code}").as_bytes())[..6].iter().map(|b| format!("{b:02x}")).collect()
}

pub struct Shared {
    pub history: Arc<History>,
    pub config: Arc<Mutex<StationConfig>>,
}

impl Shared {
    fn identity(&self) -> Option<(String, String, u32, bool)> {
        let cfg = self.config.lock().ok()?;
        // Without an event code there is no secret, so the station neither serves nor syncs.
        let enabled = cfg.sync_enabled && !cfg.event_code.is_empty();
        Some((cfg.station_id.clone(), cfg.event_code.clone(), cfg.name_retention_days, enabled))
    }
}

fn now_ms() -> i64 {
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

fn same_swarm(shared: &Shared, headers: &HeaderMap) -> Result<u32, StatusCode> {
    let (_, event, retention, enabled) = shared.identity().ok_or(StatusCode::SERVICE_UNAVAILABLE)?;
    let header = |name: &str| headers.get(name).and_then(|v| v.to_str().ok()).unwrap_or_default().to_string();
    if !enabled || header("x-codinglab-v") != PROTOCOL || header("x-codinglab-event") != event {
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

pub fn router(shared: Arc<Shared>) -> Router {
    Router::new()
        .route("/health", get(health))
        .route("/records", get(get_records).post(post_records))
        .layer(axum::extract::DefaultBodyLimit::max(MAX_BODY_BYTES))
        .with_state(shared)
}

/// A peer reached over HTTP.
pub struct HttpRemote {
    station: String,
    base_url: String,
    event: String,
    agent: ureq::Agent,
}

impl HttpRemote {
    pub fn new(station: &str, base_url: &str, event: &str) -> Self {
        Self {
            station: station.into(),
            base_url: base_url.trim_end_matches('/').into(),
            event: event.into(),
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
            .set("x-codinglab-event", &self.event)
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
            .set("x-codinglab-event", &self.event)
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
    fn seen(&self, station: &str, name: &str, address: &str, event_hash: &str) {
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
        if map.len() >= MAX_PEERS
            && let Some(oldest) = map.iter().min_by_key(|(_, e)| e.seen_at).map(|(k, _)| k.clone()) {
                map.remove(&oldest);
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

    fn targets(&self, event_hash: &str) -> Vec<PeerInfo> {
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
    let peers = Arc::new(Peers::default());

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
mod tests {
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

    fn shared(event: &str) -> Arc<Shared> {
        let cfg = StationConfig { event_code: event.into(), ..Default::default() };
        Arc::new(Shared { history: Arc::new(History::in_memory().unwrap()), config: Arc::new(Mutex::new(cfg)) })
    }

    async fn serve(s: Arc<Shared>) -> String {
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
                .set("x-codinglab-event", "TDOT")
                .set("x-codinglab-v", PROTOCOL)
                .set("content-type", "application/json")
                .send_string("{ nope");
            let many: Vec<SessionRecord> = (0..(MAX_PAGE + 1)).map(|i| record(&format!("r{i}"), "X", NOW, None)).collect();
            let too_many = ureq::post(&format!("{url}/records"))
                .set("x-codinglab-event", "TDOT")
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
}
