use crate::error::AppResult;
use serde::{Deserialize, Serialize};
use std::path::Path;

pub const CONFIG_FILE: &str = "station.json";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase", default)]
pub struct SmtpSettings {
    pub host: String,
    pub port: u16,
    pub username: String,
    pub from: String,
    pub starttls: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase", default)]
pub struct StationConfig {
    pub station_id: String,
    pub station_name: String,
    pub event_code: String,
    pub sync_enabled: bool,
    pub idle_seconds: u32,
    /// Kiosk mode: the window covers the whole screen.
    pub fullscreen: bool,
    pub enabled_missions: Option<Vec<String>>,
    pub qr_url: String,
    pub name_retention_days: u32,
    pub manual_peers: Vec<String>,
    pub smtp: SmtpSettings,
    /// Kept in its own file (`admin.pin`), so a broken config never removes the PIN.
    #[serde(default, skip_serializing)]
    pub pin_hash: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct EditableConfig {
    pub station_name: String,
    pub event_code: String,
    pub sync_enabled: bool,
    pub idle_seconds: u32,
    pub fullscreen: bool,
    pub enabled_missions: Option<Vec<String>>,
    pub qr_url: String,
    pub name_retention_days: u32,
    pub manual_peers: Vec<String>,
    pub smtp: SmtpSettings,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PublicConfig {
    pub station_id: String,
    #[serde(flatten)]
    pub editable: EditableConfig,
    pub has_pin: bool,
    pub smtp_ready: bool,
}

impl Default for SmtpSettings {
    fn default() -> Self {
        Self { host: String::new(), port: 587, username: String::new(), from: String::new(), starttls: true }
    }
}

impl Default for StationConfig {
    fn default() -> Self {
        let id = uuid::Uuid::new_v4().to_string();
        Self {
            station_name: format!("Station {}", id[..4].to_uppercase()),
            station_id: id,
            event_code: String::new(),
            sync_enabled: true,
            idle_seconds: 90,
            fullscreen: true,
            enabled_missions: None,
            qr_url: "https://www.htl-villach.at".into(),
            name_retention_days: 7,
            manual_peers: Vec::new(),
            smtp: SmtpSettings::default(),
            pin_hash: None,
        }
    }
}

impl StationConfig {
    pub fn editable(&self) -> EditableConfig {
        EditableConfig {
            station_name: self.station_name.clone(),
            event_code: self.event_code.clone(),
            sync_enabled: self.sync_enabled,
            idle_seconds: self.idle_seconds,
            fullscreen: self.fullscreen,
            enabled_missions: self.enabled_missions.clone(),
            qr_url: self.qr_url.clone(),
            name_retention_days: self.name_retention_days,
            manual_peers: self.manual_peers.clone(),
            smtp: self.smtp.clone(),
        }
    }

    pub fn apply(&mut self, e: EditableConfig) {
        self.station_name = e.station_name.trim().to_string();
        self.event_code = e.event_code.trim().to_string();
        self.sync_enabled = e.sync_enabled;
        self.idle_seconds = e.idle_seconds.clamp(30, 600);
        self.fullscreen = e.fullscreen;
        // An empty selection would leave visitors with nothing to play: treat it as "all".
        self.enabled_missions = e.enabled_missions.filter(|list| !list.is_empty());
        self.qr_url = e.qr_url.trim().to_string();
        self.name_retention_days = e.name_retention_days.clamp(1, 365);
        self.manual_peers = e
            .manual_peers
            .iter()
            .map(|p| p.trim().to_string())
            .filter(|p| !p.is_empty())
            .take(10)
            .collect();
        self.smtp = SmtpSettings {
            host: e.smtp.host.trim().to_string(),
            port: e.smtp.port,
            username: e.smtp.username.trim().to_string(),
            from: e.smtp.from.trim().to_string(),
            starttls: e.smtp.starttls,
        };
    }

    pub fn public(&self, password_set: bool) -> PublicConfig {
        let _ = password_set; // a server without login is allowed; host and sender are required
        PublicConfig {
            station_id: self.station_id.clone(),
            editable: self.editable(),
            has_pin: self.pin_hash.is_some(),
            smtp_ready: !self.smtp.host.is_empty() && !self.smtp.from.is_empty(),
        }
    }
}

pub const LAST_GOOD_FILE: &str = "station.last-good.json";
pub const PIN_FILE: &str = "admin.pin";

fn read_config(path: &Path) -> Option<StationConfig> {
    serde_json::from_str(&std::fs::read_to_string(path).ok()?).ok()
}

/// Loads the station config. A broken file falls back to the last good copy, then to defaults;
/// the PIN lives in its own file and survives either way.
pub fn load(dir: &Path) -> AppResult<StationConfig> {
    let path = dir.join(CONFIG_FILE);
    let (mut cfg, needs_save) = if path.exists() {
        match read_config(&path) {
            Some(cfg) => (cfg, false),
            None => {
                // Keep the broken file for inspection.
                let _ = std::fs::rename(&path, dir.join("station.json.bak"));
                (read_config(&dir.join(LAST_GOOD_FILE)).unwrap_or_default(), true)
            }
        }
    } else {
        (StationConfig::default(), true)
    };
    match crate::secrets::read_secret(dir, PIN_FILE)? {
        Some(hash) if !hash.trim().is_empty() => cfg.pin_hash = Some(hash.trim().to_string()),
        // Older config files stored the hash inline: move it to its own file.
        _ if cfg.pin_hash.is_some() => {}
        _ => cfg.pin_hash = None,
    }
    if needs_save || cfg.pin_hash.is_some() {
        save(dir, &cfg)?;
    }
    Ok(cfg)
}

fn write_atomic(dir: &Path, name: &str, bytes: &[u8]) -> AppResult<()> {
    use std::io::Write;
    let tmp = dir.join(format!("{name}.tmp"));
    let mut file = std::fs::File::create(&tmp)?;
    file.write_all(bytes)?;
    file.sync_all()?;
    std::fs::rename(tmp, dir.join(name))?;
    Ok(())
}

/// Atomic, flushed save of the config plus a last-good copy; the PIN goes to its own file.
pub fn save(dir: &Path, cfg: &StationConfig) -> AppResult<()> {
    std::fs::create_dir_all(dir)?;
    let bytes = serde_json::to_vec_pretty(cfg)?;
    write_atomic(dir, CONFIG_FILE, &bytes)?;
    write_atomic(dir, LAST_GOOD_FILE, &bytes)?;
    if let Some(hash) = &cfg.pin_hash
        && crate::secrets::read_secret(dir, PIN_FILE)?.as_deref() != Some(hash.as_str())
    {
        crate::secrets::write_secret(dir, PIN_FILE, hash)?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn creates_defaults_on_first_start() {
        let dir = tempfile::tempdir().unwrap();
        let cfg = load(dir.path()).unwrap();
        assert_eq!(cfg.station_id.len(), 36);
        assert!(cfg.station_name.starts_with("Station "));
        assert_eq!(cfg.idle_seconds, 90);
        assert_eq!(cfg.smtp.port, 587);
        assert!(cfg.pin_hash.is_none());
        assert!(dir.path().join(CONFIG_FILE).exists());
        assert_eq!(load(dir.path()).unwrap().station_id, cfg.station_id);
    }

    #[test]
    fn saves_and_loads() {
        let dir = tempfile::tempdir().unwrap();
        let mut cfg = load(dir.path()).unwrap();
        cfg.event_code = "TDOT26".into();
        save(dir.path(), &cfg).unwrap();
        assert_eq!(load(dir.path()).unwrap(), cfg);
    }

    #[test]
    fn recovers_from_a_corrupt_file() {
        let dir = tempfile::tempdir().unwrap();
        std::fs::write(dir.path().join(CONFIG_FILE), "{ not json").unwrap();
        let cfg = load(dir.path()).unwrap();
        assert_eq!(cfg.idle_seconds, 90);
        assert!(dir.path().join("station.json.bak").exists());
    }

    #[test]
    fn fills_missing_fields_with_defaults() {
        let dir = tempfile::tempdir().unwrap();
        std::fs::write(dir.path().join(CONFIG_FILE), r#"{"stationId":"abc","eventCode":"X"}"#).unwrap();
        let cfg = load(dir.path()).unwrap();
        assert_eq!(cfg.station_id, "abc");
        assert_eq!(cfg.event_code, "X");
        assert_eq!(cfg.idle_seconds, 90);
    }

    #[test]
    fn apply_trims_and_clamps() {
        let mut cfg = StationConfig::default();
        let mut e = cfg.editable();
        e.station_name = "  Halle A  ".into();
        e.idle_seconds = 5;
        e.enabled_missions = Some(vec![]);
        cfg.apply(e);
        assert_eq!(cfg.station_name, "Halle A");
        assert_eq!(cfg.idle_seconds, 30);
        assert_eq!(cfg.enabled_missions, None);
    }

    #[test]
    fn public_view_hides_the_pin_hash() {
        let mut cfg = StationConfig { pin_hash: Some("secret".into()), ..Default::default() };
        cfg.smtp.host = "mail.example.org".into();
        cfg.smtp.from = "lab@example.org".into();
        let public = cfg.public(true);
        let json = serde_json::to_string(&public).unwrap();
        assert!(!json.contains("secret"));
        assert!(public.has_pin);
        assert!(public.smtp_ready);
        assert!(json.contains("\"stationName\""));
        assert!(!StationConfig::default().public(false).smtp_ready);
    }

    #[test]
    fn keeps_the_pin_when_the_config_file_breaks() {
        let dir = tempfile::tempdir().unwrap();
        let mut cfg = load(dir.path()).unwrap();
        cfg.pin_hash = Some("$argon2id$fake".into());
        save(dir.path(), &cfg).unwrap();
        assert!(!std::fs::read_to_string(dir.path().join(CONFIG_FILE)).unwrap().contains("argon2"));
        std::fs::write(dir.path().join(CONFIG_FILE), "{ broken").unwrap();
        let loaded = load(dir.path()).unwrap();
        assert_eq!(loaded.pin_hash.as_deref(), Some("$argon2id$fake"));
    }

    #[test]
    fn falls_back_to_the_last_good_copy() {
        let dir = tempfile::tempdir().unwrap();
        let mut cfg = load(dir.path()).unwrap();
        cfg.event_code = "TDOT".into();
        save(dir.path(), &cfg).unwrap();
        std::fs::write(dir.path().join(CONFIG_FILE), "{ broken").unwrap();
        let loaded = load(dir.path()).unwrap();
        assert_eq!(loaded.station_id, cfg.station_id);
        assert_eq!(loaded.event_code, "TDOT");
    }
    #[test]
    fn is_fullscreen_by_default_and_can_be_turned_off() {
        let mut cfg = StationConfig::default();
        assert!(cfg.fullscreen);
        let mut e = cfg.editable();
        e.fullscreen = false;
        cfg.apply(e);
        assert!(!cfg.fullscreen);
    }

    #[test]
    fn has_retention_and_manual_peer_defaults() {
        let cfg = StationConfig::default();
        assert_eq!(cfg.name_retention_days, 7);
        assert!(cfg.manual_peers.is_empty());
    }

    #[test]
    fn apply_cleans_retention_and_peers() {
        let mut cfg = StationConfig::default();
        let mut e = cfg.editable();
        e.name_retention_days = 0;
        e.manual_peers = vec![" 192.168.0.5:47800 ".into(), "".into(), "10.0.0.2".into()];
        cfg.apply(e);
        assert_eq!(cfg.name_retention_days, 1);
        assert_eq!(cfg.manual_peers, vec!["192.168.0.5:47800".to_string(), "10.0.0.2".to_string()]);
    }
}
