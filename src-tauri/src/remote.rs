//! Commands from the master station to the others (LAN only).
//! The event hash is broadcast via mDNS, so it must not be enough to command a station:
//! every command is signed with an HMAC whose key only holders of the event code can derive.

use crate::admin;
use crate::config;
use crate::error::{AppError, AppResult};
use crate::sync::{self, Shared, PROTOCOL, SWARM_HEADER};
use axum::body::Bytes;
use axum::extract::State;
use axum::http::{HeaderMap, StatusCode};
use axum::Json;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::sync::{Arc, Mutex};
use std::time::Duration;

pub const MAX_COMMAND_BYTES: usize = 16 * 1024;
pub const MAX_TEXT_CHARS: usize = 200;
const MAX_MISSIONS: usize = 100;
const MAX_ID_LEN: usize = 64;
/// The stations' clocks must agree this well (commands are only valid briefly).
const MAX_SKEW_MS: i64 = 30_000;
/// A command id is remembered this long, so a recorded command cannot be played again.
const REPLAY_WINDOW_MS: i64 = 5 * 60_000;
const SEND_TIMEOUT: Duration = Duration::from_secs(3);
const SIG_HEADER: &str = "x-codinglab-sig";
/// The Tauri event the frontend listens to.
pub const EVENT_NAME: &str = "remote-command";

/// What the master can ask a station to do (mirrors `RemoteCommand` in src/lib/platform/types.ts).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum RemoteCommand {
    Reset,
    Pause {
        on: bool,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        text: Option<String>,
    },
    Message { text: String },
    EndHelp,
    ShowSolution,
    Settings { settings: RemoteSettings },
}

/// The settings the master may change; a missing field stays as it is.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoteSettings {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub idle_seconds: Option<f64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub sound: Option<bool>,
    /// Missing = unchanged, null = all missions.
    #[serde(default, deserialize_with = "present", skip_serializing_if = "Option::is_none")]
    pub enabled_missions: Option<Option<Vec<String>>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub wall_mode: Option<bool>,
}

/// A field that is present (even as null) becomes Some.
fn present<'de, D: serde::Deserializer<'de>, T: Deserialize<'de>>(d: D) -> Result<Option<T>, D::Error> {
    T::deserialize(d).map(Some)
}

impl RemoteCommand {
    /// Checks texts and clamps numbers like the admin settings do.
    pub fn normalized(self) -> Result<Self, String> {
        let too_long = |t: &str| t.chars().count() > MAX_TEXT_CHARS;
        match self {
            RemoteCommand::Pause { text: Some(t), .. } | RemoteCommand::Message { text: t } if too_long(&t) => {
                Err(format!("Der Text darf höchstens {MAX_TEXT_CHARS} Zeichen haben."))
            }
            RemoteCommand::Settings { mut settings } => {
                settings.idle_seconds = settings.idle_seconds.map(|s| s.round().clamp(30.0, 600.0));
                if let Some(Some(list)) = &settings.enabled_missions {
                    if list.len() > MAX_MISSIONS {
                        return Err("Zu viele Missionen.".into());
                    }
                    // An empty selection would leave visitors with nothing to play: treat it as "all".
                    if list.is_empty() {
                        settings.enabled_missions = Some(None);
                    }
                }
                Ok(RemoteCommand::Settings { settings })
            }
            other => Ok(other),
        }
    }
}

type Notify = Box<dyn Fn(&RemoteCommand) + Send + Sync>;

/// Replay guard and the hand-over of received commands to the frontend.
#[derive(Default)]
pub struct Inbox {
    seen: Mutex<HashMap<String, i64>>,
    notify: Mutex<Option<Notify>>,
}

impl Inbox {
    /// Called for every command this station carries out.
    pub fn on_command(&self, f: impl Fn(&RemoteCommand) + Send + Sync + 'static) {
        if let Ok(mut slot) = self.notify.lock() {
            *slot = Some(Box::new(f));
        }
    }

    /// True the first time an id shows up within the replay window.
    fn first_time(&self, id: &str, now: i64) -> bool {
        let Ok(mut seen) = self.seen.lock() else { return false };
        seen.retain(|_, at| now - *at < REPLAY_WINDOW_MS);
        if seen.contains_key(id) {
            return false;
        }
        seen.insert(id.to_string(), now);
        true
    }
}

/// HMAC-SHA256 (RFC 2104) on top of sha2.
pub fn hmac_sha256(key: &[u8], message: &[u8]) -> [u8; 32] {
    use sha2::{Digest, Sha256};
    let mut block = [0u8; 64];
    if key.len() > block.len() {
        block[..32].copy_from_slice(&Sha256::digest(key));
    } else {
        block[..key.len()].copy_from_slice(key);
    }
    let mut inner = Sha256::new();
    inner.update(block.map(|b| b ^ 0x36));
    inner.update(message);
    let mut outer = Sha256::new();
    outer.update(block.map(|b| b ^ 0x5c));
    outer.update(inner.finalize());
    outer.finalize().into()
}

fn command_key(event: &str) -> [u8; 32] {
    use sha2::{Digest, Sha256};
    Sha256::digest(format!("codinglab-command:{event}").as_bytes()).into()
}

fn hex(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{b:02x}")).collect()
}

fn unhex(text: &str) -> Option<Vec<u8>> {
    if !text.len().is_multiple_of(2) || !text.is_ascii() {
        return None;
    }
    (0..text.len()).step_by(2).map(|i| u8::from_str_radix(&text[i..i + 2], 16).ok()).collect()
}

/// Takes the same time however many bytes match.
pub(crate) fn same_bytes(a: &[u8], b: &[u8]) -> bool {
    a.len() == b.len() && a.iter().zip(b).fold(0u8, |acc, (x, y)| acc | (x ^ y)) == 0
}

/// The signature for a command body (hex).
pub fn sign(event: &str, body: &[u8]) -> String {
    hex(&hmac_sha256(&command_key(event), body))
}

fn signature_ok(event: &str, body: &[u8], signature: &str) -> bool {
    !event.is_empty() && unhex(signature).is_some_and(|sig| same_bytes(&sig, &hmac_sha256(&command_key(event), body)))
}

/// What goes over the wire; the signature covers exactly these bytes.
#[derive(Debug, Serialize, Deserialize)]
struct Envelope {
    id: String,
    /// When the master sent it (ms epoch).
    ts: i64,
    from: String,
    /// The one station this envelope is for: a recorded command cannot be played to another station.
    to: String,
    command: RemoteCommand,
}

/// Carries out a checked command: settings are applied and saved here, the rest is the frontend's job.
pub fn execute(shared: &Shared, command: &RemoteCommand) -> AppResult<()> {
    if let RemoteCommand::Settings { settings } = command {
        let mut cfg = shared.config.lock().map_err(|_| AppError::Other("Einstellungen sind blockiert.".into()))?;
        if let Some(seconds) = settings.idle_seconds {
            cfg.idle_seconds = seconds.round().clamp(30.0, 600.0) as u32;
        }
        if let Some(sound) = settings.sound {
            cfg.sound = sound;
        }
        if let Some(missions) = &settings.enabled_missions {
            cfg.enabled_missions = missions.clone().filter(|list| !list.is_empty());
        }
        if let Some(wall) = settings.wall_mode {
            cfg.wall_mode = wall;
        }
        config::save(&shared.dir, &cfg)?;
    }
    if let Ok(notify) = shared.inbox.notify.lock()
        && let Some(f) = notify.as_ref()
    {
        f(command);
    }
    Ok(())
}

/// POST /command: only a correctly signed, fresh, unseen command from our event, addressed to this station, is carried out.
/// A command outside the clock window gets TOO_EARLY (425), so the master can tell a wrong clock from a wrong key.
pub async fn receive(State(shared): State<Arc<Shared>>, headers: HeaderMap, body: Bytes) -> Result<Json<serde_json::Value>, StatusCode> {
    sync::same_swarm(&shared, &headers)?;
    if body.len() > MAX_COMMAND_BYTES {
        return Err(StatusCode::PAYLOAD_TOO_LARGE);
    }
    let (own_id, event, _, _) = shared.identity().unwrap_or_default();
    let signature = headers.get(SIG_HEADER).and_then(|v| v.to_str().ok()).unwrap_or_default();
    if !signature_ok(&event, &body, signature) {
        return Err(StatusCode::FORBIDDEN);
    }
    let envelope: Envelope = serde_json::from_slice(&body).map_err(|_| StatusCode::BAD_REQUEST)?;
    if own_id.is_empty() || envelope.to != own_id {
        return Err(StatusCode::FORBIDDEN);
    }
    let now = sync::now_ms();
    if now.checked_sub(envelope.ts).is_none_or(|d| d.unsigned_abs() > MAX_SKEW_MS as u64) {
        return Err(StatusCode::TOO_EARLY);
    }
    if envelope.id.is_empty() || envelope.id.len() > MAX_ID_LEN {
        return Err(StatusCode::BAD_REQUEST);
    }
    let command = envelope.command.normalized().map_err(|_| StatusCode::BAD_REQUEST)?;
    if !shared.inbox.first_time(&envelope.id, now) {
        return Err(StatusCode::CONFLICT);
    }
    execute(&shared, &command).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(Json(serde_json::json!({ "ok": true })))
}

/// How sending to one station went.
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SendResult {
    pub station_id: String,
    pub ok: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

fn post(address: &str, token: &str, signature: &str, body: &str) -> Result<(), String> {
    let reply = ureq::post(&format!("http://{address}/command"))
        .timeout(SEND_TIMEOUT)
        .set(SWARM_HEADER, token)
        .set("x-codinglab-v", PROTOCOL)
        .set(SIG_HEADER, signature)
        .set("content-type", "application/json")
        .send_string(body);
    match reply {
        Ok(_) => Ok(()),
        Err(ureq::Error::Status(425, _)) => Err("Uhrzeit weicht ab".into()),
        Err(ureq::Error::Status(code, _)) => Err(format!("abgelehnt ({code})")),
        Err(_) => Err("nicht erreichbar".into()),
    }
}

enum Pending {
    Done(Result<(), String>),
    Sending(tokio::task::JoinHandle<Result<(), String>>),
}

/// Sends a command to the given stations (at least one; this station only if its own id is listed).
/// Needs the admin PIN, the master role and an event code. This station is handled without HTTP;
/// the others are asked at once, each with a short timeout and its own envelope signed for it alone.
pub async fn send(shared: &Shared, pin: &str, targets: Vec<String>, command: RemoteCommand) -> AppResult<Vec<SendResult>> {
    let (own_id, event) = {
        let cfg = shared.config.lock().map_err(|_| AppError::Other("Einstellungen sind blockiert.".into()))?;
        admin::require_pin(cfg.pin_hash.as_deref(), pin)?;
        if !cfg.master {
            return Err(AppError::NotMaster);
        }
        if cfg.event_code.is_empty() {
            return Err(AppError::NoEvent);
        }
        (cfg.station_id.clone(), cfg.event_code.clone())
    };
    if targets.is_empty() {
        return Err(AppError::NoTargets);
    }
    let command = command.normalized().map_err(AppError::Other)?;
    let peers: HashMap<String, String> = shared
        .peers
        .targets(&sync::event_hash(&event))
        .into_iter()
        .filter(|p| p.station != own_id)
        .map(|p| (p.station, p.address))
        .collect();
    let mut wanted = targets;
    let mut unique = HashSet::new();
    wanted.retain(|id| unique.insert(id.clone()));

    let token = sync::swarm_token(&event);
    let mut pending: Vec<(String, Pending)> = Vec::with_capacity(wanted.len());
    for id in wanted {
        let job = if id == own_id {
            Pending::Done(execute(shared, &command).map_err(|e| e.to_string()))
        } else if let Some(address) = peers.get(&id).cloned() {
            let envelope = Envelope { id: uuid::Uuid::new_v4().to_string(), ts: sync::now_ms(), from: own_id.clone(), to: id.clone(), command: command.clone() };
            let body = serde_json::to_string(&envelope)?;
            let signature = sign(&event, body.as_bytes());
            let token = token.clone();
            Pending::Sending(tokio::task::spawn_blocking(move || post(&address, &token, &signature, &body)))
        } else {
            Pending::Done(Err("Station unbekannt".into()))
        };
        pending.push((id, job));
    }
    let mut results = Vec::with_capacity(pending.len());
    for (station_id, job) in pending {
        let outcome = match job {
            Pending::Done(r) => r,
            Pending::Sending(task) => task.await.unwrap_or_else(|e| Err(e.to_string())),
        };
        results.push(SendResult { station_id, ok: outcome.is_ok(), error: outcome.err() });
    }
    Ok(results)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::StationConfig;
    use crate::history::History;
    use crate::sync::tests::serve;
    use crate::sync::{event_hash, swarm_token, Peers};

    fn station(event: &str, dir: &std::path::Path) -> Arc<Shared> {
        let cfg = StationConfig { event_code: event.into(), ..Default::default() };
        Arc::new(Shared {
            history: Arc::new(History::in_memory().unwrap()),
            config: Arc::new(Mutex::new(cfg)),
            peers: Arc::new(Peers::default()),
            status: Mutex::new(None),
            dir: dir.to_path_buf(),
            inbox: Default::default(),
        })
    }

    fn recorder(s: &Shared) -> Arc<Mutex<Vec<RemoteCommand>>> {
        let got = Arc::new(Mutex::new(Vec::new()));
        let sink = got.clone();
        s.inbox.on_command(move |c| sink.lock().unwrap().push(c.clone()));
        got
    }

    fn real_now() -> i64 {
        chrono::Utc::now().timestamp_millis()
    }

    fn id_of(s: &Shared) -> String {
        s.config.lock().unwrap().station_id.clone()
    }

    fn envelope(to: &str, id: &str, ts: i64, command: serde_json::Value) -> String {
        serde_json::json!({ "id": id, "ts": ts, "from": "MASTER", "to": to, "command": command }).to_string()
    }

    /// Posts a raw body with the swarm token of `event`; returns the HTTP status.
    async fn post_raw(url: &str, event: &str, signature: Option<String>, body: String) -> u16 {
        post_with_header(url, &swarm_token(event), signature, body).await
    }

    async fn post_with_header(url: &str, header: &str, signature: Option<String>, body: String) -> u16 {
        let url = url.to_string();
        let header = header.to_string();
        tokio::task::spawn_blocking(move || {
            let mut req = ureq::post(&format!("{url}/command"))
                .set(SWARM_HEADER, &header)
                .set("x-codinglab-v", PROTOCOL)
                .set("content-type", "application/json");
            if let Some(sig) = signature {
                req = req.set(SIG_HEADER, &sig);
            }
            match req.send_string(&body) {
                Ok(r) => r.status(),
                Err(ureq::Error::Status(code, _)) => code,
                Err(e) => panic!("{e}"),
            }
        })
        .await
        .unwrap()
    }

    #[test]
    fn hmac_matches_rfc_4231() {
        // Test case 2.
        assert_eq!(hex(&hmac_sha256(b"Jefe", b"what do ya want for nothing?")), "5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843");
        // Test case 6: a key longer than the block is hashed first.
        assert_eq!(
            hex(&hmac_sha256(&[0xaa; 131], b"Test Using Larger Than Block-Size Key - Hash Key First")),
            "60e431591ee0b67f0d8a26aacbf5b77f8e0bc6213728c5140546040f0ee37f54"
        );
    }

    #[test]
    fn checks_signatures() {
        let body = b"{\"x\":1}";
        let sig = sign("TDOT", body);
        assert!(signature_ok("TDOT", body, &sig));
        assert!(!signature_ok("OTHER", body, &sig));
        assert!(!signature_ok("TDOT", b"{\"x\":2}", &sig));
        assert!(!signature_ok("TDOT", body, &sig[..62]));
        assert!(!signature_ok("TDOT", body, "zz"));
        assert!(!signature_ok("", body, &sign("", body)), "no event code, no commands");
        // The event hash is public (mDNS): it must not work as a key.
        assert!(!signature_ok("TDOT", body, &hex(&hmac_sha256(event_hash("TDOT").as_bytes(), body))));
        // Nor is the swarm token, which every peer of the event receives.
        assert!(!signature_ok("TDOT", body, &hex(&hmac_sha256(swarm_token("TDOT").as_bytes(), body))));
        let key = hex(&command_key("TDOT"));
        assert_ne!(key, swarm_token("TDOT"));
        assert!(!key.starts_with(&event_hash("TDOT")));
    }

    #[test]
    fn commands_use_the_contract_shape() {
        let cmd: RemoteCommand = serde_json::from_str(r#"{"kind":"pause","on":true,"text":"Kurze Pause"}"#).unwrap();
        assert_eq!(cmd, RemoteCommand::Pause { on: true, text: Some("Kurze Pause".into()) });
        assert_eq!(serde_json::from_str::<RemoteCommand>(r#"{"kind":"endHelp"}"#).unwrap(), RemoteCommand::EndHelp);
        assert_eq!(serde_json::to_value(RemoteCommand::ShowSolution).unwrap(), serde_json::json!({ "kind": "showSolution" }));
        let s: RemoteCommand = serde_json::from_str(r#"{"kind":"settings","settings":{"enabledMissions":null}}"#).unwrap();
        assert_eq!(s, RemoteCommand::Settings { settings: RemoteSettings { enabled_missions: Some(None), ..Default::default() } });
        let s: RemoteCommand = serde_json::from_str(r#"{"kind":"settings","settings":{}}"#).unwrap();
        assert_eq!(s, RemoteCommand::Settings { settings: RemoteSettings::default() });
        let long = "x".repeat(MAX_TEXT_CHARS + 1);
        assert!(RemoteCommand::Message { text: long.clone() }.normalized().is_err());
        assert!(RemoteCommand::Pause { on: true, text: Some(long) }.normalized().is_err());
        assert!(RemoteCommand::Message { text: "ü".repeat(MAX_TEXT_CHARS) }.normalized().is_ok(), "characters, not bytes");
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn accepts_a_signed_command_once() {
        let dir = tempfile::tempdir().unwrap();
        let s = station("TDOT", dir.path());
        let got = recorder(&s);
        let me = id_of(&s);
        let url = serve(s).await;
        let body = envelope(&me, "c1", real_now(), serde_json::json!({ "kind": "message", "text": "Hallo" }));
        assert_eq!(post_raw(&url, "TDOT", Some(sign("TDOT", body.as_bytes())), body.clone()).await, 200);
        assert_eq!(*got.lock().unwrap(), vec![RemoteCommand::Message { text: "Hallo".into() }]);
        assert_eq!(post_raw(&url, "TDOT", Some(sign("TDOT", body.as_bytes())), body).await, 409, "replayed");
        assert_eq!(got.lock().unwrap().len(), 1);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn rejects_bad_commands() {
        let dir = tempfile::tempdir().unwrap();
        let s = station("TDOT", dir.path());
        let got = recorder(&s);
        let me = id_of(&s);
        let url = serve(s).await;
        let cmd = serde_json::json!({ "kind": "reset" });
        let fresh = envelope(&me, "a", real_now(), cmd.clone());
        assert_eq!(post_raw(&url, "TDOT", None, fresh.clone()).await, 403, "unsigned");
        assert_eq!(post_raw(&url, "TDOT", Some(sign("OTHER", fresh.as_bytes())), fresh.clone()).await, 403, "wrong key");
        assert_eq!(post_raw(&url, "OTHER", Some(sign("TDOT", fresh.as_bytes())), fresh.clone()).await, 403, "not our swarm");
        assert_eq!(post_with_header(&url, "TDOT", Some(sign("TDOT", fresh.as_bytes())), fresh.clone()).await, 403, "the raw code (old builds)");
        let elsewhere = envelope("SOMEONE-ELSE", "e", real_now(), cmd.clone());
        assert_eq!(post_raw(&url, "TDOT", Some(sign("TDOT", elsewhere.as_bytes())), elsewhere).await, 403, "for another station");
        let unaddressed = serde_json::json!({ "id": "f", "ts": real_now(), "from": "MASTER", "command": cmd }).to_string();
        assert_eq!(post_raw(&url, "TDOT", Some(sign("TDOT", unaddressed.as_bytes())), unaddressed).await, 400, "no recipient");
        let tampered = fresh.replace("reset", "endHelp");
        assert_eq!(post_raw(&url, "TDOT", Some(sign("TDOT", fresh.as_bytes())), tampered).await, 403, "body changed");
        for ts in [real_now() - MAX_SKEW_MS - 1_000, real_now() + MAX_SKEW_MS + 1_000, i64::MIN] {
            let stale = envelope(&me, "b", ts, cmd.clone());
            assert_eq!(post_raw(&url, "TDOT", Some(sign("TDOT", stale.as_bytes())), stale).await, 425, "clock, ts {ts}");
        }
        let long = envelope(&me, "c", real_now(), serde_json::json!({ "kind": "message", "text": "x".repeat(MAX_TEXT_CHARS + 1) }));
        assert_eq!(post_raw(&url, "TDOT", Some(sign("TDOT", long.as_bytes())), long).await, 400);
        let huge = envelope(&me, "d", real_now(), serde_json::json!({ "kind": "reset", "pad": "x".repeat(MAX_COMMAND_BYTES) }));
        assert_eq!(post_raw(&url, "TDOT", Some(sign("TDOT", huge.as_bytes())), huge).await, 413);
        assert!(got.lock().unwrap().is_empty());
        // The stale one did not burn its id: a fresh command with it still works.
        let retry = envelope(&me, "b", real_now(), cmd);
        assert_eq!(post_raw(&url, "TDOT", Some(sign("TDOT", retry.as_bytes())), retry).await, 200);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn refuses_commands_without_an_event_code() {
        let dir = tempfile::tempdir().unwrap();
        let s = station("", dir.path());
        let me = id_of(&s);
        let url = serve(s).await;
        let body = envelope(&me, "a", real_now(), serde_json::json!({ "kind": "reset" }));
        assert_eq!(post_raw(&url, "", Some(sign("", body.as_bytes())), body).await, 403);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn applies_and_clamps_remote_settings() {
        let dir = tempfile::tempdir().unwrap();
        let s = station("TDOT", dir.path());
        let got = recorder(&s);
        let me = id_of(&s);
        let url = serve(s.clone()).await;
        let body = envelope(&me, "s1", real_now(), serde_json::json!({ "kind": "settings", "settings": { "idleSeconds": 5, "sound": false, "enabledMissions": [], "wallMode": true } }));
        assert_eq!(post_raw(&url, "TDOT", Some(sign("TDOT", body.as_bytes())), body).await, 200);
        {
            let cfg = s.config.lock().unwrap();
            assert_eq!(cfg.idle_seconds, 30);
            assert!(!cfg.sound);
            assert_eq!(cfg.enabled_missions, None);
            assert!(cfg.wall_mode);
            assert_eq!(cfg.event_code, "TDOT", "other settings stay");
        }
        let saved = config::load(dir.path()).unwrap();
        assert_eq!(saved.idle_seconds, 30);
        assert!(saved.wall_mode);
        let sent = got.lock().unwrap()[0].clone();
        assert_eq!(serde_json::to_value(sent).unwrap()["settings"]["idleSeconds"], 30.0, "the frontend sees the clamped value");

        let body = envelope(&me, "s2", real_now(), serde_json::json!({ "kind": "settings", "settings": { "idleSeconds": 9000, "enabledMissions": ["1.1", "1.2"] } }));
        assert_eq!(post_raw(&url, "TDOT", Some(sign("TDOT", body.as_bytes())), body).await, 200);
        let cfg = s.config.lock().unwrap();
        assert_eq!(cfg.idle_seconds, 600);
        assert_eq!(cfg.enabled_missions, Some(vec!["1.1".to_string(), "1.2".to_string()]));
        assert!(!cfg.sound, "missing fields stay as they were");
    }

    fn master(event: &str, dir: &std::path::Path) -> Arc<Shared> {
        let s = station(event, dir);
        {
            let mut cfg = s.config.lock().unwrap();
            cfg.master = true;
            cfg.pin_hash = Some(admin::hash_pin("2468").unwrap());
        }
        s
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn send_needs_pin_master_event_code_and_targets() {
        let dir = tempfile::tempdir().unwrap();
        let s = master("TDOT", dir.path());
        let got = recorder(&s);
        let me = vec![id_of(&s)];
        assert!(matches!(send(&s, "0000", me.clone(), RemoteCommand::Reset).await, Err(AppError::WrongPin)));
        s.config.lock().unwrap().master = false;
        assert!(matches!(send(&s, "2468", me.clone(), RemoteCommand::Reset).await, Err(AppError::NotMaster)));
        s.config.lock().unwrap().master = true;
        assert!(matches!(send(&s, "2468", vec![], RemoteCommand::Reset).await, Err(AppError::NoTargets)), "empty is not 'everyone'");
        s.config.lock().unwrap().event_code = String::new();
        assert!(matches!(send(&s, "2468", me.clone(), RemoteCommand::Reset).await, Err(AppError::NoEvent)));
        s.config.lock().unwrap().pin_hash = None;
        assert!(matches!(send(&s, "2468", me.clone(), RemoteCommand::Reset).await, Err(AppError::PinRequired)));
        assert!(got.lock().unwrap().is_empty());
        let s = master("TDOT", dir.path());
        let long = RemoteCommand::Message { text: "x".repeat(MAX_TEXT_CHARS + 1) };
        assert!(matches!(send(&s, "2468", vec![id_of(&s)], long).await, Err(AppError::Other(_))));
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn sends_to_the_fleet_and_itself() {
        let (dir_a, dir_b, dir_c) = (tempfile::tempdir().unwrap(), tempfile::tempdir().unwrap(), tempfile::tempdir().unwrap());
        let a = master("TDOT", dir_a.path());
        let (b, c) = (station("TDOT", dir_b.path()), station("TDOT", dir_c.path()));
        let (got_a, got_b, got_c) = (recorder(&a), recorder(&b), recorder(&c));
        let (b_id, c_id) = (id_of(&b), id_of(&c));
        let b_addr = serve(b.clone()).await.trim_start_matches("http://").to_string();
        let c_addr = serve(c.clone()).await.trim_start_matches("http://").to_string();
        let hash = event_hash("TDOT");
        a.peers.seen(&b_id, "Halle B", &b_addr, &hash);
        a.peers.seen(&c_id, "Halle C", &c_addr, &hash);
        a.peers.seen("D", "Halle D", "127.0.0.1:1", &hash);
        let a_id = id_of(&a);
        let cmd = RemoteCommand::Pause { on: true, text: Some("Gleich geht's weiter".into()) };
        let results = send(&a, "2468", vec![a_id.clone(), b_id.clone(), c_id.clone(), "D".into()], cmd.clone()).await.unwrap();
        let ids: Vec<&str> = results.iter().map(|r| r.station_id.as_str()).collect();
        assert_eq!(ids, vec![a_id.as_str(), b_id.as_str(), c_id.as_str(), "D"]);
        assert!(results[0].ok && results[1].ok && results[2].ok, "each station gets its own envelope: {results:?}");
        assert!(!results[3].ok && results[3].error.is_some());
        assert_eq!(*got_a.lock().unwrap(), vec![cmd.clone()]);
        assert_eq!(*got_b.lock().unwrap(), vec![cmd.clone()]);
        assert_eq!(*got_c.lock().unwrap(), vec![cmd]);

        let picked = send(&a, "2468", vec![b_id.clone(), b_id.clone(), "nobody".into()], RemoteCommand::EndHelp).await.unwrap();
        assert_eq!(picked.len(), 2);
        assert!(picked[0].ok);
        assert_eq!(picked[1], SendResult { station_id: "nobody".into(), ok: false, error: Some("Station unbekannt".into()) });
        assert_eq!(got_b.lock().unwrap().len(), 2, "a second command gets a new id");
        assert_eq!(got_a.lock().unwrap().len(), 1, "this station only when listed");
        assert_eq!(got_c.lock().unwrap().len(), 1);
        let json = serde_json::to_value(&picked[0]).unwrap();
        assert_eq!(json, serde_json::json!({ "stationId": b_id, "ok": true }));
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn a_command_for_one_station_cannot_be_replayed_to_another() {
        let (dir_b, dir_c) = (tempfile::tempdir().unwrap(), tempfile::tempdir().unwrap());
        let (b, c) = (station("TDOT", dir_b.path()), station("TDOT", dir_c.path()));
        let got_c = recorder(&c);
        let b_id = id_of(&b);
        let (b_url, c_url) = (serve(b).await, serve(c).await);
        let body = envelope(&b_id, "r1", real_now(), serde_json::json!({ "kind": "reset" }));
        let sig = sign("TDOT", body.as_bytes());
        assert_eq!(post_raw(&b_url, "TDOT", Some(sig.clone()), body.clone()).await, 200);
        assert_eq!(post_raw(&c_url, "TDOT", Some(sig), body).await, 403);
        assert!(got_c.lock().unwrap().is_empty());
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn a_wrong_clock_has_its_own_error() {
        let app = axum::Router::new().fallback(|| async { StatusCode::TOO_EARLY });
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let addr = listener.local_addr().unwrap().to_string();
        tokio::spawn(async move { axum::serve(listener, app).await.unwrap() });
        let outcome = tokio::task::spawn_blocking(move || post(&addr, "t", "s", "{}")).await.unwrap();
        assert_eq!(outcome, Err("Uhrzeit weicht ab".to_string()));
    }
}
