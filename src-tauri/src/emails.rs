use crate::error::AppResult;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct EmailEntry {
    pub name: String,
    pub email: String,
    pub created_at: String,
}

/// Addresses of visitors who agreed to receive HTL information. One JSON object per line.
pub struct EmailStore {
    path: PathBuf,
}

impl EmailStore {
    pub fn new(dir: &Path) -> Self {
        Self { path: dir.join("emails.jsonl") }
    }
}

impl EmailStore {
    pub fn append(&self, entry: &EmailEntry) -> AppResult<()> {
        use std::io::Write;
        if let Some(dir) = self.path.parent() {
            std::fs::create_dir_all(dir)?;
        }
        let mut options = std::fs::OpenOptions::new();
        options.create(true).append(true);
        #[cfg(unix)]
        {
            use std::os::unix::fs::OpenOptionsExt;
            options.mode(0o600);
        }
        let mut file = options.open(&self.path)?;
        writeln!(file, "{}", serde_json::to_string(entry)?)?;
        Ok(())
    }

    pub fn all(&self) -> AppResult<Vec<EmailEntry>> {
        match std::fs::read_to_string(&self.path) {
            Ok(text) => Ok(text.lines().filter_map(|line| serde_json::from_str(line).ok()).collect()),
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(Vec::new()),
            Err(e) => Err(e.into()),
        }
    }

    pub fn count(&self) -> AppResult<usize> {
        Ok(self.all()?.len())
    }

    /// Semicolon CSV (opens directly in German Excel).
    pub fn export_csv(&self) -> AppResult<String> {
        // The BOM makes Excel read the file as UTF-8 (umlauts).
        let mut out = String::from("\u{FEFF}Name;E-Mail;Datum\n");
        for e in self.all()? {
            out.push_str(&format!("{};{};{}\n", csv_field(&e.name), csv_field(&e.email), csv_field(&e.created_at)));
        }
        Ok(out)
    }

    pub fn delete_all(&self) -> AppResult<usize> {
        let count = self.count()?;
        match std::fs::remove_file(&self.path) {
            Ok(()) => Ok(count),
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(0),
            Err(e) => Err(e.into()),
        }
    }
}

fn csv_field(value: &str) -> String {
    // A leading = + - @ would run as a formula in spreadsheets.
    let safe = if value.starts_with(['=', '+', '-', '@']) { format!("'{value}") } else { value.to_string() };
    if safe.contains([';', '"', '\n', '\r']) || safe != value {
        format!("\"{}\"", safe.replace('"', "\"\""))
    } else {
        safe
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn entry(name: &str, email: &str) -> EmailEntry {
        EmailEntry { name: name.into(), email: email.into(), created_at: "2026-10-10T10:00:00+02:00".into() }
    }

    #[test]
    fn appends_counts_and_deletes() {
        let dir = tempfile::tempdir().unwrap();
        let store = EmailStore::new(dir.path());
        assert_eq!(store.count().unwrap(), 0);
        store.append(&entry("Lea", "lea@example.org")).unwrap();
        store.append(&entry("Max", "max@example.org")).unwrap();
        assert_eq!(store.count().unwrap(), 2);
        assert_eq!(store.delete_all().unwrap(), 2);
        assert_eq!(store.count().unwrap(), 0);
    }

    #[test]
    fn exports_semicolon_csv_with_escaping() {
        let dir = tempfile::tempdir().unwrap();
        let store = EmailStore::new(dir.path());
        store.append(&entry("Lea; \"die Große\"", "lea@example.org")).unwrap();
        let csv = store.export_csv().unwrap();
        let lines: Vec<&str> = csv.lines().collect();
        assert_eq!(lines[0], "\u{FEFF}Name;E-Mail;Datum");
        assert_eq!(lines[1], "\"Lea; \"\"die Große\"\"\";lea@example.org;2026-10-10T10:00:00+02:00");
    }

    #[test]
    fn neutralises_formulas_for_spreadsheets() {
        let dir = tempfile::tempdir().unwrap();
        let store = EmailStore::new(dir.path());
        store.append(&entry("=HYPERLINK(\"x\")", "a@b.at")).unwrap();
        let csv = store.export_csv().unwrap();
        assert!(csv.lines().nth(1).unwrap().starts_with("\"'=HYPERLINK"));
    }

    #[test]
    fn skips_broken_lines() {
        let dir = tempfile::tempdir().unwrap();
        let store = EmailStore::new(dir.path());
        store.append(&entry("Lea", "lea@example.org")).unwrap();
        std::fs::OpenOptions::new().append(true).open(dir.path().join("emails.jsonl")).unwrap();
        std::fs::write(
            dir.path().join("emails.jsonl"),
            format!("{}\nnot json\n", std::fs::read_to_string(dir.path().join("emails.jsonl")).unwrap().trim_end()),
        )
        .unwrap();
        assert_eq!(store.count().unwrap(), 1);
    }

    #[test]
    fn starts_with_a_bom_for_excel() {
        let dir = tempfile::tempdir().unwrap();
        let csv = EmailStore::new(dir.path()).export_csv().unwrap();
        assert!(csv.starts_with('\u{FEFF}'));
    }
    #[cfg(unix)]
    #[test]
    fn email_file_is_private() {
        use std::os::unix::fs::PermissionsExt;
        let dir = tempfile::tempdir().unwrap();
        EmailStore::new(dir.path()).append(&entry("Lea", "lea@example.org")).unwrap();
        let mode = std::fs::metadata(dir.path().join("emails.jsonl")).unwrap().permissions().mode();
        assert_eq!(mode & 0o077, 0);
    }
}
