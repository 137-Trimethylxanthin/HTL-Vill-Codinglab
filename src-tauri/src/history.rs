use crate::error::{AppError, AppResult};
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use std::path::Path;
use std::sync::Mutex;

pub const MAX_PAGE: usize = 500;
/// A station cannot plausibly finish more visits than this on one day (flood protection).
pub const MAX_PER_STATION_DAY: usize = 2000;
const MAX_MISSIONS: usize = 7;
const MAX_SESSION_MS: i64 = 2 * 60 * 60 * 1000;
const MAX_NAME: usize = 16;
/// Flight-path cells per mission ("x,y"); the maps are far smaller.
const MAX_PATH: usize = 100;
const DAY_MS: i64 = 24 * 60 * 60 * 1000;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct MissionStat {
    pub id: String,
    pub stars: u8,
    pub runs: u32,
    pub blocks: u32,
    pub seconds: u32,
    pub skipped: bool,
    /// Visited cells "x,y" (for the wall display's replays); missing in older records.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub path: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct SessionRecord {
    pub id: String,
    pub v: u8,
    pub event: String,
    pub station: String,
    pub mode: String,
    pub started_at: String,
    pub finished_at: String,
    pub pilot_name: Option<String>,
    pub total_stars: u32,
    pub missions: Vec<MissionStat>,
    pub ended_by: String,
}

/// All session records this station knows (its own and synced ones), in arrival order.
pub struct History {
    conn: Mutex<Connection>,
}

fn db(e: rusqlite::Error) -> AppError {
    AppError::Other(format!("Verlauf: {e}"))
}

fn parse_ms(ts: &str) -> AppResult<i64> {
    chrono::DateTime::parse_from_rfc3339(ts)
        .map(|t| t.timestamp_millis())
        .map_err(|_| AppError::Other(format!("Ungültige Zeit: {ts}")))
}

/// Same rules as the app's name field: letters, spaces, hyphens; max 16; needs a letter.
pub fn sanitize_name(raw: &str) -> Option<String> {
    let kept: String = raw.chars().filter(|c| c.is_alphabetic() || *c == ' ' || *c == '-').collect();
    let collapsed = kept.split_whitespace().collect::<Vec<_>>().join(" ");
    let trimmed = collapsed.trim_matches(|c: char| c == ' ' || c == '-');
    let cut: String = trimmed.chars().take(MAX_NAME).collect();
    let cut = cut.trim_end_matches([' ', '-']).to_string();
    cut.chars().any(char::is_alphabetic).then_some(cut)
}

fn valid_id(s: &str) -> bool {
    (1..=64).contains(&s.len()) && s.chars().all(|c| c.is_ascii_alphanumeric() || c == '-')
}

fn valid_cell(key: &str) -> bool {
    key.split_once(',').is_some_and(|(x, y)| {
        (1..=2).contains(&x.len()) && (1..=2).contains(&y.len()) && x.chars().chain(y.chars()).all(|c| c.is_ascii_digit())
    })
}

fn invalid(why: &str) -> AppError {
    AppError::Other(format!("Ungültiger Datensatz: {why}"))
}

/// Records arrive from other stations: only plausible ones are stored, names are cleaned.
pub fn validate(record: &SessionRecord, now_ms: i64) -> AppResult<(SessionRecord, i64)> {
    if record.v != 1 || !matches!(record.mode.as_str(), "showcase" | "lern") {
        return Err(invalid("Version"));
    }
    if !valid_id(&record.id) || !valid_id(&record.station) || record.event.len() > 32 {
        return Err(invalid("Kennung"));
    }
    if !matches!(record.ended_by.as_str(), "finale" | "idle" | "quit") {
        return Err(invalid("Ende"));
    }
    if record.missions.len() > MAX_MISSIONS {
        return Err(invalid("Missionen"));
    }
    let mut seen = std::collections::HashSet::new();
    let mut stars = 0u32;
    for m in &record.missions {
        let id_ok = m.id.len() <= 5 && m.id.split_once('.').is_some_and(|(a, b)| !a.is_empty() && !b.is_empty() && a.chars().chain(b.chars()).all(|c| c.is_ascii_digit()));
        if !id_ok || !seen.insert(m.id.as_str()) || m.stars > 3 || m.runs > 10_000 || m.blocks > 100 || m.seconds > 7200 {
            return Err(invalid("Mission"));
        }
        stars += u32::from(m.stars);
    }
    if record.total_stars != stars || stars > (MAX_MISSIONS as u32) * 3 {
        return Err(invalid("Sterne"));
    }
    let started = parse_ms(&record.started_at)?;
    let finished = parse_ms(&record.finished_at)?;
    if started > finished || finished - started > MAX_SESSION_MS || finished > now_ms + DAY_MS {
        return Err(invalid("Zeit"));
    }
    let mut clean = record.clone();
    clean.pilot_name = record.pilot_name.as_deref().and_then(sanitize_name);
    // A strange flight path only costs the replay, never the visit.
    for m in &mut clean.missions {
        if m.path.as_ref().is_some_and(|p| p.len() > MAX_PATH || !p.iter().all(|k| valid_cell(k))) {
            m.path = None;
        }
    }
    Ok((clean, finished))
}

const SCHEMA: &str = "
CREATE TABLE IF NOT EXISTS sessions (
    seq INTEGER PRIMARY KEY AUTOINCREMENT,
    id TEXT NOT NULL UNIQUE,
    station TEXT NOT NULL,
    finished_ms INTEGER NOT NULL,
    named INTEGER NOT NULL,
    json TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS marks (
    peer TEXT NOT NULL,
    kind TEXT NOT NULL,
    seq INTEGER NOT NULL,
    PRIMARY KEY (peer, kind)
);
";

impl History {
    fn with(conn: Connection) -> AppResult<Self> {
        conn.execute_batch(SCHEMA).map_err(db)?;
        Ok(Self { conn: Mutex::new(conn) })
    }

    pub fn open(path: &Path) -> AppResult<Self> {
        if let Some(dir) = path.parent() {
            std::fs::create_dir_all(dir)?;
        }
        Self::with(Connection::open(path).map_err(db)?)
    }

    #[cfg(test)]
    pub fn in_memory() -> AppResult<Self> {
        Self::with(Connection::open_in_memory().map_err(db)?)
    }

    fn conn(&self) -> AppResult<std::sync::MutexGuard<'_, Connection>> {
        self.conn.lock().map_err(|_| AppError::Other("Verlauf ist blockiert.".into()))
    }

    /// Stores a record once (by id). Records older than the retention lose the name first.
    pub fn insert(&self, record: &SessionRecord, retention_days: u32, now_ms: i64) -> AppResult<bool> {
        let (mut record, finished) = validate(record, now_ms)?;
        let day_start = finished - finished.rem_euclid(DAY_MS);
        let same_day: i64 = self
            .conn()?
            .query_row(
                "SELECT COUNT(*) FROM sessions WHERE station = ?1 AND finished_ms >= ?2 AND finished_ms < ?3",
                params![record.station, day_start, day_start + DAY_MS],
                |r| r.get(0),
            )
            .map_err(db)?;
        if same_day as usize >= MAX_PER_STATION_DAY {
            return Err(invalid("zu viele Einträge"));
        }
        if finished < now_ms - i64::from(retention_days) * DAY_MS {
            record.pilot_name = None;
        }
        let json = serde_json::to_string(&record)?;
        let changed = self
            .conn()?
            .execute(
                "INSERT OR IGNORE INTO sessions (id, station, finished_ms, named, json) VALUES (?1, ?2, ?3, ?4, ?5)",
                params![record.id, record.station, finished, record.pilot_name.is_some(), json],
            )
            .map_err(db)?;
        Ok(changed == 1)
    }

    fn page(&self, sql: &str, args: &[&dyn rusqlite::ToSql], after: i64) -> AppResult<(Vec<SessionRecord>, i64)> {
        let conn = self.conn()?;
        let mut stmt = conn.prepare(sql).map_err(db)?;
        let rows = stmt
            .query_map(args, |row| Ok((row.get::<_, i64>(0)?, row.get::<_, String>(1)?)))
            .map_err(db)?;
        let mut records = Vec::new();
        let mut last = after;
        for row in rows {
            let (seq, json) = row.map_err(db)?;
            last = seq;
            // A broken row must not block the rest of the history.
            if let Ok(record) = serde_json::from_str(&json) {
                records.push(record);
            }
        }
        Ok((records, last))
    }

    pub fn after(&self, seq: i64, limit: usize) -> AppResult<(Vec<SessionRecord>, i64)> {
        let limit = limit.min(MAX_PAGE) as i64;
        self.page("SELECT seq, json FROM sessions WHERE seq > ?1 ORDER BY seq LIMIT ?2", &[&seq, &limit], seq)
    }

    pub fn own_after(&self, station: &str, seq: i64, limit: usize) -> AppResult<(Vec<SessionRecord>, i64)> {
        let limit = limit.min(MAX_PAGE) as i64;
        self.page(
            "SELECT seq, json FROM sessions WHERE seq > ?1 AND station = ?2 ORDER BY seq LIMIT ?3",
            &[&seq, &station, &limit],
            seq,
        )
    }

    pub fn all(&self) -> AppResult<Vec<SessionRecord>> {
        Ok(self.page("SELECT seq, json FROM sessions ORDER BY seq", &[], 0)?.0)
    }

    #[cfg(test)]
    pub fn count(&self) -> AppResult<usize> {
        let n: i64 = self.conn()?.query_row("SELECT COUNT(*) FROM sessions", [], |r| r.get(0)).map_err(db)?;
        Ok(n as usize)
    }

    /// Removes names from records that are older than the retention. Returns how many changed.
    pub fn redact_older_than(&self, days: u32, now_ms: i64) -> AppResult<usize> {
        let cutoff = now_ms - i64::from(days) * DAY_MS;
        let conn = self.conn()?;
        let mut stmt = conn
            .prepare("SELECT seq, json FROM sessions WHERE named = 1 AND finished_ms < ?1")
            .map_err(db)?;
        let rows: Vec<(i64, String)> = stmt
            .query_map([cutoff], |row| Ok((row.get(0)?, row.get(1)?)))
            .map_err(db)?
            .filter_map(Result::ok)
            .collect();
        for (seq, json) in &rows {
            let mut record: SessionRecord = serde_json::from_str(json)?;
            record.pilot_name = None;
            conn.execute(
                "UPDATE sessions SET named = 0, json = ?1 WHERE seq = ?2",
                params![serde_json::to_string(&record)?, seq],
            )
            .map_err(db)?;
        }
        Ok(rows.len())
    }

    pub fn delete_all(&self) -> AppResult<usize> {
        let conn = self.conn()?;
        // Marks are kept on purpose: records still exist on the peers.
        conn.execute("DELETE FROM sessions", []).map_err(db)
    }

    pub fn mark(&self, peer: &str, kind: &str) -> AppResult<i64> {
        Ok(self
            .conn()?
            .query_row("SELECT seq FROM marks WHERE peer = ?1 AND kind = ?2", params![peer, kind], |r| r.get(0))
            .optional()
            .map_err(db)?
            .unwrap_or(0))
    }

    pub fn set_mark(&self, peer: &str, kind: &str, seq: i64) -> AppResult<()> {
        self.conn()?
            .execute(
                "INSERT INTO marks (peer, kind, seq) VALUES (?1, ?2, ?3) ON CONFLICT(peer, kind) DO UPDATE SET seq = excluded.seq",
                params![peer, kind, seq],
            )
            .map_err(db)?;
        Ok(())
    }
}

#[cfg(test)]
pub(crate) mod tests {
    use super::*;

    pub fn record(id: &str, station: &str, finished_at: &str, name: Option<&str>) -> SessionRecord {
        SessionRecord {
            id: id.into(),
            v: 1,
            event: String::new(),
            station: station.into(),
            mode: "showcase".into(),
            started_at: finished_at.into(),
            finished_at: finished_at.into(),
            pilot_name: name.map(Into::into),
            total_stars: 3,
            missions: vec![MissionStat { id: "1.1".into(), stars: 3, runs: 1, blocks: 3, seconds: 40, skipped: false, path: None }],
            ended_by: "finale".into(),
        }
    }

    const NOW: &str = "2026-10-10T12:00:00.000Z";
    fn now_ms() -> i64 {
        chrono::DateTime::parse_from_rfc3339(NOW).unwrap().timestamp_millis()
    }

    #[test]
    fn inserts_once_per_id() {
        let h = History::in_memory().unwrap();
        let r = record("a", "s1", NOW, Some("Lea"));
        assert!(h.insert(&r, 7, now_ms()).unwrap());
        assert!(!h.insert(&r, 7, now_ms()).unwrap());
        assert_eq!(h.count().unwrap(), 1);
        assert_eq!(h.all().unwrap(), vec![r]);
    }

    #[test]
    fn pages_by_sequence() {
        let h = History::in_memory().unwrap();
        for i in 0..5 {
            h.insert(&record(&format!("r{i}"), "s1", NOW, None), 7, now_ms()).unwrap();
        }
        let (page, last) = h.after(0, 2).unwrap();
        assert_eq!(page.iter().map(|r| r.id.as_str()).collect::<Vec<_>>(), vec!["r0", "r1"]);
        let (rest, end) = h.after(last, 10).unwrap();
        assert_eq!(rest.len(), 3);
        assert_eq!(h.after(end, 10).unwrap(), (vec![], end));
    }

    #[test]
    fn own_after_only_returns_this_stations_records() {
        let h = History::in_memory().unwrap();
        h.insert(&record("a", "s1", NOW, None), 7, now_ms()).unwrap();
        h.insert(&record("b", "s2", NOW, None), 7, now_ms()).unwrap();
        let (own, _) = h.own_after("s1", 0, 10).unwrap();
        assert_eq!(own.iter().map(|r| r.id.as_str()).collect::<Vec<_>>(), vec!["a"]);
    }

    #[test]
    fn redacts_on_insert_when_older_than_retention() {
        let h = History::in_memory().unwrap();
        h.insert(&record("old", "s1", "2026-09-01T10:00:00.000Z", Some("Lea")), 7, now_ms()).unwrap();
        h.insert(&record("new", "s1", "2026-10-09T10:00:00.000Z", Some("Max")), 7, now_ms()).unwrap();
        let all = h.all().unwrap();
        assert_eq!(all[0].pilot_name, None);
        assert_eq!(all[1].pilot_name.as_deref(), Some("Max"));
    }

    #[test]
    fn redacts_existing_records_later() {
        let h = History::in_memory().unwrap();
        h.insert(&record("a", "s1", "2026-10-09T10:00:00.000Z", Some("Lea")), 7, now_ms()).unwrap();
        let in_ten_days = now_ms() + 10 * DAY_MS;
        assert_eq!(h.redact_older_than(7, in_ten_days).unwrap(), 1);
        assert_eq!(h.all().unwrap()[0].pilot_name, None);
        assert_eq!(h.redact_older_than(7, in_ten_days).unwrap(), 0);
    }

    #[test]
    fn remembers_peer_marks() {
        let h = History::in_memory().unwrap();
        assert_eq!(h.mark("peer", "pull").unwrap(), 0);
        h.set_mark("peer", "pull", 42).unwrap();
        assert_eq!(h.mark("peer", "pull").unwrap(), 42);
        assert_eq!(h.mark("peer", "push").unwrap(), 0);
    }

    #[test]
    fn deletes_everything_local() {
        let h = History::in_memory().unwrap();
        h.insert(&record("a", "s1", NOW, None), 7, now_ms()).unwrap();
        h.set_mark("peer", "pull", 3).unwrap();
        assert_eq!(h.delete_all().unwrap(), 1);
        assert_eq!(h.count().unwrap(), 0);
        // Marks stay: pulling everything again from peers would undo nothing anyway.
        assert_eq!(h.mark("peer", "pull").unwrap(), 3);
    }

    #[test]
    fn rejects_records_with_bad_timestamps() {
        let h = History::in_memory().unwrap();
        assert!(h.insert(&record("x", "s1", "yesterday", None), 7, now_ms()).is_err());
    }

    #[test]
    fn persists_to_a_file() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("history.sqlite");
        History::open(&path).unwrap().insert(&record("a", "s1", NOW, None), 7, now_ms()).unwrap();
        assert_eq!(History::open(&path).unwrap().count().unwrap(), 1);
    }

    #[test]
    fn cleans_names_like_the_app() {
        assert_eq!(sanitize_name("  Lea<script> ").as_deref(), Some("Leascript"));
        assert_eq!(sanitize_name("Jürgen-Maß").as_deref(), Some("Jürgen-Maß"));
        assert_eq!(sanitize_name("Abcdefghijklmnopqrstuvwxyz").map(|n| n.chars().count()), Some(16));
        assert_eq!(sanitize_name("----"), None);
        assert_eq!(sanitize_name("1234"), None);
    }

    #[test]
    fn rejects_impossible_records() {
        let h = History::in_memory().unwrap();
        let ok = record("ok-1", "s1", NOW, Some("Lea"));
        let mut too_many_stars = ok.clone();
        too_many_stars.id = "x1".into();
        too_many_stars.total_stars = 4_000_000_000;
        let mut future = ok.clone();
        future.id = "x2".into();
        future.finished_at = "2027-01-01T00:00:00.000Z".into();
        let mut backwards = ok.clone();
        backwards.id = "x3".into();
        backwards.started_at = "2026-10-10T13:00:00.000Z".into();
        let mut many = ok.clone();
        many.id = "x4".into();
        many.missions = (0..8).map(|i| MissionStat { id: format!("1.{i}"), stars: 0, runs: 0, blocks: 0, seconds: 0, skipped: true, path: None }).collect();
        many.total_stars = 0;
        let mut bad_id = ok.clone();
        bad_id.id = "not an id!".into();
        let mut too_long = ok.clone();
        too_long.id = "x5".into();
        too_long.started_at = "2026-10-10T08:00:00.000Z".into();
        for bad in [too_many_stars, future, backwards, many, bad_id, too_long] {
            assert!(h.insert(&bad, 7, now_ms()).is_err(), "{bad:?}");
        }
        assert!(h.insert(&ok, 7, now_ms()).unwrap());
    }

    #[test]
    fn keeps_the_flight_path_and_reads_records_without_one() {
        let h = History::in_memory().unwrap();
        let mut r = record("p1", "s1", NOW, None);
        r.missions[0].path = Some(vec!["0,4".into(), "0,3".into()]);
        h.insert(&r, 7, now_ms()).unwrap();
        assert_eq!(h.all().unwrap()[0].missions[0].path, r.missions[0].path);
        let mut bad = record("p2", "s1", NOW, None);
        bad.missions[0].path = Some(vec!["0,0".into(), "<script>".into()]);
        let mut long = record("p3", "s1", NOW, None);
        long.missions[0].path = Some(vec!["1,1".into(); MAX_PATH + 1]);
        for r in [bad, long] {
            let (clean, _) = validate(&r, now_ms()).unwrap();
            assert_eq!(clean.missions[0].path, None);
        }
        let old = r#"{"id":"1.1","stars":3,"runs":1,"blocks":3,"seconds":40,"skipped":false}"#;
        let m: MissionStat = serde_json::from_str(old).unwrap();
        assert_eq!(m.path, None);
        assert!(!serde_json::to_string(&m).unwrap().contains("path"));
    }

    #[test]
    fn stores_the_cleaned_name() {
        let h = History::in_memory().unwrap();
        h.insert(&record("n1", "s1", NOW, Some("<b>Max</b> 3000")), 7, now_ms()).unwrap();
        assert_eq!(h.all().unwrap()[0].pilot_name.as_deref(), Some("bMaxb"));
    }

    #[test]
    fn caps_records_per_station_and_day() {
        let h = History::in_memory().unwrap();
        for i in 0..MAX_PER_STATION_DAY {
            h.insert(&record(&format!("c{i}"), "flood", NOW, None), 7, now_ms()).unwrap();
        }
        assert!(h.insert(&record("one-more", "flood", NOW, None), 7, now_ms()).is_err());
        assert!(h.insert(&record("other", "calm", NOW, None), 7, now_ms()).unwrap());
    }
}
