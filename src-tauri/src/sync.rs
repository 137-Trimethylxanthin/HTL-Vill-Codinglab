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
}
