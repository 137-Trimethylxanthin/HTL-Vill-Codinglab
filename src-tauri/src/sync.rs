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

/// One sync round with one peer: pull everything new from it, then push our own new records.
/// Marks are advanced only after a page was stored, so an interrupted round resumes safely.
pub fn sync_with(local: &History, own_station: &str, remote: &dyn Remote, retention_days: u32, now_ms: i64) -> AppResult<SyncReport> {
    let peer = remote.station().to_string();
    let mut report = SyncReport::default();

    let mut after = local.mark(&peer, "pull")?;
    loop {
        let (records, last) = remote.pull(after)?;
        for r in &records {
            if local.insert(r, retention_days, now_ms)? {
                report.pulled += 1;
            }
        }
        if last <= after {
            break;
        }
        local.set_mark(&peer, "pull", last)?;
        after = last;
    }

    let mut pushed_to = local.mark(&peer, "push")?;
    loop {
        let (own, last) = local.own_after(own_station, pushed_to, MAX_PAGE)?;
        if own.is_empty() {
            if last > pushed_to {
                local.set_mark(&peer, "push", last)?;
            }
            break;
        }
        report.pushed += remote.push(&own)?;
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

pub struct Shared {
    pub history: Arc<History>,
    pub config: Arc<Mutex<StationConfig>>,
}

impl Shared {
    fn identity(&self) -> Option<(String, String, u32, bool)> {
        let cfg = self.config.lock().ok()?;
        Some((cfg.station_id.clone(), cfg.event_code.clone(), cfg.name_retention_days, cfg.sync_enabled))
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
    Ok(Json(serde_json::json!({ "station": station, "event": event, "v": PROTOCOL })))
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
    let Json(values) = body.map_err(|_| StatusCode::BAD_REQUEST)?;
    if values.len() > MAX_PAGE {
        return Err(StatusCode::PAYLOAD_TOO_LARGE);
    }
    let mut accepted = 0;
    for value in values {
        // One broken record must not block the others.
        let Ok(record) = serde_json::from_value::<SessionRecord>(value) else { continue };
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

impl Remote for HttpRemote {
    fn station(&self) -> &str {
        &self.station
    }

    fn pull(&self, after: i64) -> AppResult<(Vec<SessionRecord>, i64)> {
        let page: Page = self
            .agent
            .get(&format!("{}/records", self.base_url))
            .set("x-codinglab-event", &self.event)
            .set("x-codinglab-v", PROTOCOL)
            .query("after", &after.to_string())
            .call()
            .map_err(net)?
            .into_json()
            .map_err(net)?;
        Ok((page.records, page.last))
    }

    fn push(&self, records: &[SessionRecord]) -> AppResult<usize> {
        let reply: serde_json::Value = self
            .agent
            .post(&format!("{}/records", self.base_url))
            .set("x-codinglab-event", &self.event)
            .set("x-codinglab-v", PROTOCOL)
            .send_json(records)
            .map_err(net)?
            .into_json()
            .map_err(net)?;
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

/// Stations seen on the network (mDNS) or configured by hand.
#[derive(Default)]
pub struct Peers {
    map: Mutex<HashMap<String, (PeerInfo, String)>>, // station → (info, event)
}

impl Peers {
    fn seen(&self, station: &str, name: &str, address: &str, event: &str) {
        if let Ok(mut map) = self.map.lock() {
            let last_ok = map.get(station).and_then(|(p, _)| p.last_ok_ms);
            map.insert(
                station.into(),
                (
                    PeerInfo { station: station.into(), name: name.into(), address: address.into(), last_seen_ms: now_ms(), last_ok_ms: last_ok },
                    event.into(),
                ),
            );
        }
    }

    fn ok(&self, station: &str) {
        if let Ok(mut map) = self.map.lock() {
            if let Some((p, _)) = map.get_mut(station) {
                p.last_ok_ms = Some(now_ms());
            }
        }
    }

    pub fn list(&self) -> Vec<PeerInfo> {
        self.map.lock().map(|m| m.values().map(|(p, _)| p.clone()).collect()).unwrap_or_default()
    }

    fn targets(&self, event: &str) -> Vec<PeerInfo> {
        self.map
            .lock()
            .map(|m| m.values().filter(|(_, e)| e == event).map(|(p, _)| p.clone()).collect())
            .unwrap_or_default()
    }
}

/// One round: sync with every known peer of our event. Errors stay per peer.
fn round(shared: &Shared, peers: &Peers) {
    let Some((station, event, retention, enabled)) = shared.identity() else { return };
    let _ = shared.history.redact_older_than(retention, now_ms());
    if !enabled {
        return;
    }
    let manual = shared.config.lock().map(|c| c.manual_peers.clone()).unwrap_or_default();
    for address in manual {
        let base = if address.contains(':') { address.clone() } else { format!("{address}:{SYNC_PORT}") };
        if let Ok(reply) = ureq::get(&format!("http://{base}/health")).timeout(Duration::from_secs(3)).call() {
            if let Ok(body) = reply.into_json::<serde_json::Value>() {
                let peer = body["station"].as_str().unwrap_or_default();
                let peer_event = body["event"].as_str().unwrap_or_default();
                if !peer.is_empty() && peer != station && body["v"] == PROTOCOL {
                    peers.seen(peer, &base, &base, peer_event);
                }
            }
        }
    }
    for peer in peers.targets(&event) {
        if peer.station == station {
            continue;
        }
        let remote = HttpRemote::new(&peer.station, &format!("http://{}", peer.address), &event);
        if sync_with(&shared.history, &station, &remote, retention, now_ms()).is_ok() {
            peers.ok(&peer.station);
        }
    }
}

fn discover(shared: &Shared, peers: Arc<Peers>) -> Result<mdns_sd::ServiceDaemon, mdns_sd::Error> {
    let daemon = mdns_sd::ServiceDaemon::new()?;
    if let Some((station, event, _, _)) = shared.identity() {
        let name = shared.config.lock().map(|c| c.station_name.clone()).unwrap_or_default();
        let host = format!("codinglab-{}.local.", &station[..8.min(station.len())]);
        let props = [("station", station.as_str()), ("event", event.as_str()), ("v", PROTOCOL), ("name", name.as_str())];
        #[cfg(desktop)]
        {
            let info = mdns_sd::ServiceInfo::new(SERVICE_TYPE, &station, &host, "", SYNC_PORT, &props[..])?.enable_addr_auto();
            daemon.register(info)?;
        }
        let _ = (&host, &props);
    }
    let receiver = daemon.browse(SERVICE_TYPE)?;
    std::thread::spawn(move || {
        while let Ok(event) = receiver.recv() {
            if let mdns_sd::ServiceEvent::ServiceResolved(info) = event {
                let station = info.get_property_val_str("station").unwrap_or_default().to_string();
                let peer_event = info.get_property_val_str("event").unwrap_or_default().to_string();
                let name = info.get_property_val_str("name").unwrap_or_default().to_string();
                let v = info.get_property_val_str("v").unwrap_or_default();
                let Some(ip) = info.addresses.iter().map(|a| a.to_ip_addr()).find(|ip| ip.is_ipv4()) else { continue };
                if !station.is_empty() && v == PROTOCOL {
                    peers.seen(&station, &name, &format!("{ip}:{}", info.port), &peer_event);
                }
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

    let daemon = discover(&shared, peers.clone()).map_err(|e| eprintln!("mDNS not available: {e}")).ok();
    let loop_peers = peers.clone();
    std::thread::spawn(move || {
        let _keep_daemon = daemon;
        let mut next = Instant::now();
        loop {
            if Instant::now() >= next {
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
        let report = sync_with(&a, "A", &Local { id: "B", history: &b }, 7, now_ms()).unwrap();
        assert_eq!(report, SyncReport { pulled: 1, pushed: 1 });
        assert_eq!(ids(&a), vec!["a1", "b1"]);
        assert_eq!(ids(&b), vec!["a1", "b1"]);
    }

    #[test]
    fn does_nothing_the_second_time() {
        let a = History::in_memory().unwrap();
        let b = History::in_memory().unwrap();
        a.insert(&record("a1", "A", NOW, None), 7, now_ms()).unwrap();
        sync_with(&a, "A", &Local { id: "B", history: &b }, 7, now_ms()).unwrap();
        let again = sync_with(&a, "A", &Local { id: "B", history: &b }, 7, now_ms()).unwrap();
        assert_eq!(again, SyncReport::default());
    }

    #[test]
    fn relays_through_a_peer() {
        let a = History::in_memory().unwrap();
        let b = History::in_memory().unwrap();
        let c = History::in_memory().unwrap();
        c.insert(&record("c1", "C", NOW, None), 7, now_ms()).unwrap();
        sync_with(&b, "B", &Local { id: "C", history: &c }, 7, now_ms()).unwrap();
        sync_with(&a, "A", &Local { id: "B", history: &b }, 7, now_ms()).unwrap();
        assert_eq!(ids(&a), vec!["c1"]);
    }

    #[test]
    fn catches_up_after_being_offline() {
        let a = History::in_memory().unwrap();
        let b = History::in_memory().unwrap();
        sync_with(&a, "A", &Local { id: "B", history: &b }, 7, now_ms()).unwrap();
        // offline: both collect visitors
        for i in 0..3 {
            a.insert(&record(&format!("a{i}"), "A", NOW, None), 7, now_ms()).unwrap();
            b.insert(&record(&format!("b{i}"), "B", NOW, None), 7, now_ms()).unwrap();
        }
        sync_with(&a, "A", &Local { id: "B", history: &b }, 7, now_ms()).unwrap();
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
        let report = sync_with(&a, "A", &Local { id: "B", history: &b }, 7, now_ms()).unwrap();
        assert_eq!(report.pulled, MAX_PAGE + 20);
    }

    #[test]
    fn does_not_push_records_of_other_stations() {
        let a = History::in_memory().unwrap();
        let b = History::in_memory().unwrap();
        a.insert(&record("c1", "C", NOW, None), 7, now_ms()).unwrap();
        let report = sync_with(&a, "A", &Local { id: "B", history: &b }, 7, now_ms()).unwrap();
        assert_eq!(report.pushed, 0);
    }
    use crate::config::StationConfig;
    use std::sync::{Arc, Mutex};

    fn shared(event: &str) -> Arc<Shared> {
        let mut cfg = StationConfig::default();
        cfg.event_code = event.into();
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
        server.history.insert(&record("s1", "SERVER", NOW, Some("Lea")), 7, now_ms()).unwrap();
        let url = serve(server.clone()).await;
        let client = History::in_memory().unwrap();
        client.insert(&record("c1", "CLIENT", NOW, None), 7, now_ms()).unwrap();
        let report = tokio::task::spawn_blocking(move || {
            let remote = HttpRemote::new("SERVER", &url, "TDOT");
            let r = sync_with(&client, "CLIENT", &remote, 7, now_ms()).unwrap();
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
        let url = serve(shared("")).await;
        let (bad, too_many) = tokio::task::spawn_blocking(move || {
            let bad = ureq::post(&format!("{url}/records"))
                .set("x-codinglab-event", "")
                .set("x-codinglab-v", PROTOCOL)
                .set("content-type", "application/json")
                .send_string("{ nope");
            let many: Vec<SessionRecord> = (0..(MAX_PAGE + 1)).map(|i| record(&format!("r{i}"), "X", NOW, None)).collect();
            let too_many = ureq::post(&format!("{url}/records"))
                .set("x-codinglab-event", "")
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
        assert_eq!(body["event"], "TDOT");
        assert_eq!(body["v"], PROTOCOL);
    }
}
