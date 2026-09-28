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
    pub enabled_missions: Option<Vec<String>>,
    pub qr_url: String,
    pub smtp: SmtpSettings,
    pub pin_hash: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct EditableConfig {
    pub station_name: String,
    pub event_code: String,
    pub sync_enabled: bool,
    pub idle_seconds: u32,
    pub enabled_missions: Option<Vec<String>>,
    pub qr_url: String,
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
            enabled_missions: None,
            qr_url: "https://www.htl-villach.at".into(),
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
            enabled_missions: self.enabled_missions.clone(),
            qr_url: self.qr_url.clone(),
            smtp: self.smtp.clone(),
        }
    }

    pub fn apply(&mut self, e: EditableConfig) {
        self.station_name = e.station_name.trim().to_string();
        self.event_code = e.event_code.trim().to_string();
        self.sync_enabled = e.sync_enabled;
        self.idle_seconds = e.idle_seconds.clamp(30, 600);
        // An empty selection would leave visitors with nothing to play: treat it as "all".
        self.enabled_missions = e.enabled_missions.filter(|list| !list.is_empty());
        self.qr_url = e.qr_url.trim().to_string();
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

pub fn load(dir: &Path) -> AppResult<StationConfig> {
    let path = dir.join(CONFIG_FILE);
    match std::fs::read_to_string(&path) {
        Ok(text) => match serde_json::from_str::<StationConfig>(&text) {
            Ok(cfg) => Ok(cfg),
            Err(_) => {
                // Keep the broken file for inspection and start fresh.
                std::fs::rename(&path, dir.join("station.json.bak"))?;
                let cfg = StationConfig::default();
                save(dir, &cfg)?;
                Ok(cfg)
            }
        },
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => {
            let cfg = StationConfig::default();
            save(dir, &cfg)?;
            Ok(cfg)
        }
        Err(e) => Err(e.into()),
    }
}

/// Atomic save: write a temp file, then rename over the old one.
pub fn save(dir: &Path, cfg: &StationConfig) -> AppResult<()> {
    std::fs::create_dir_all(dir)?;
    let tmp = dir.join("station.json.tmp");
    std::fs::write(&tmp, serde_json::to_vec_pretty(cfg)?)?;
    std::fs::rename(tmp, dir.join(CONFIG_FILE))?;
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
        let mut cfg = StationConfig::default();
        cfg.pin_hash = Some("secret".into());
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
}
