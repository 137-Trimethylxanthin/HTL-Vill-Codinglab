use crate::admin;
use crate::certificate::{self, CertificateData};
use crate::config::{self, EditableConfig, PublicConfig, StationConfig};
use crate::emails::{EmailEntry, EmailStore};
use crate::error::{AppError, AppResult};
use crate::mail;
use crate::history::{History, SessionRecord};
use crate::secrets::{self, SMTP_SECRET};
use crate::remote::{self, RemoteCommand, SendResult};
use crate::sync::{self, FleetRow, PeerInfo, Peers, Shared, StationStatus};
use std::sync::Arc;
use std::path::PathBuf;
use std::sync::{Mutex, MutexGuard};
use tauri::{AppHandle, State};
use tauri_plugin_dialog::DialogExt;

pub struct AppState {
    pub dir: PathBuf,
    pub config: Arc<Mutex<StationConfig>>,
    pub emails: EmailStore,
    pub history: Arc<History>,
    pub peers: Arc<Peers>,
    pub sync: Arc<Shared>,
}

impl AppState {
    fn config(&self) -> AppResult<MutexGuard<'_, StationConfig>> {
        self.config.lock().map_err(|_| AppError::Other("Einstellungen sind blockiert.".into()))
    }

    fn public(&self, cfg: &StationConfig) -> AppResult<PublicConfig> {
        Ok(cfg.public(secrets::read_secret(&self.dir, SMTP_SECRET)?.is_some()))
    }

    fn require_pin(&self, pin: &str) -> AppResult<()> {
        let cfg = self.config()?;
        admin::require_pin(cfg.pin_hash.as_deref(), pin)
    }
}

async fn save_with_dialog(app: &AppHandle, file_name: &str, filter: (&str, &[&str]), bytes: Vec<u8>) -> AppResult<Option<String>> {
    let picked = app.dialog().file().set_file_name(file_name).add_filter(filter.0, filter.1).blocking_save_file();
    let Some(picked) = picked else { return Ok(None) };
    let path = picked.into_path().map_err(|e| AppError::Other(e.to_string()))?;
    std::fs::write(&path, bytes)?;
    Ok(Some(path.display().to_string()))
}

#[tauri::command]
pub fn get_config(state: State<'_, AppState>) -> AppResult<PublicConfig> {
    let cfg = state.config()?;
    state.public(&cfg)
}

#[tauri::command]
pub fn verify_pin(state: State<'_, AppState>, pin: String) -> AppResult<bool> {
    let cfg = state.config()?;
    Ok(cfg.pin_hash.as_deref().is_some_and(|hash| admin::verify_pin(hash, &pin)))
}

#[tauri::command]
pub fn set_pin(state: State<'_, AppState>, old_pin: Option<String>, new_pin: String) -> AppResult<()> {
    let mut cfg = state.config()?;
    if cfg.pin_hash.is_some() {
        admin::require_pin(cfg.pin_hash.as_deref(), old_pin.as_deref().unwrap_or_default())?;
    }
    cfg.pin_hash = Some(admin::hash_pin(&new_pin)?);
    config::save(&state.dir, &cfg)
}

#[derive(serde::Serialize)]
pub struct PlatformInfo {
    pub mobile: bool,
    pub os: &'static str,
}

#[tauri::command]
pub fn platform_info() -> PlatformInfo {
    PlatformInfo { mobile: cfg!(mobile), os: std::env::consts::OS }
}

/// The main window follows the kiosk setting (a no-op on phones, where it is ignored).
pub fn apply_window(app: &AppHandle, cfg: &StationConfig) {
    use tauri::Manager;
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.set_fullscreen(cfg.fullscreen);
    }
}

#[tauri::command]
pub fn save_config(app: AppHandle, state: State<'_, AppState>, pin: String, config: EditableConfig) -> AppResult<PublicConfig> {
    let mut cfg = state.config()?;
    admin::require_pin(cfg.pin_hash.as_deref(), &pin)?;
    cfg.apply(config);
    config::save(&state.dir, &cfg)?;
    apply_window(&app, &cfg);
    state.public(&cfg)
}

#[tauri::command]
pub fn set_smtp_password(state: State<'_, AppState>, pin: String, password: String) -> AppResult<()> {
    state.require_pin(&pin)?;
    secrets::write_secret(&state.dir, SMTP_SECRET, &password)
}

#[tauri::command]
pub fn save_certificate(state: State<'_, AppState>, data: CertificateData) -> AppResult<Option<String>> {
    let path = certificate::write_certificate(&state.dir, &data, chrono::Utc::now().timestamp_millis())?;
    Ok(Some(path.display().to_string()))
}

#[tauri::command]
pub async fn send_certificate(state: State<'_, AppState>, email: String, consent: bool, data: CertificateData) -> AppResult<()> {
    if !mail::is_valid_email(&email) {
        return Err(AppError::InvalidEmail);
    }
    let (smtp, qr_url) = {
        let cfg = state.config()?;
        (cfg.smtp.clone(), cfg.qr_url.clone())
    };
    if smtp.host.is_empty() || smtp.from.is_empty() {
        return Err(AppError::NoSmtp);
    }
    let password = secrets::read_secret(&state.dir, SMTP_SECRET)?;
    let pdf = certificate::build_pdf(&data)?;
    let message = mail::certificate_message(&smtp.from, &email, &data.pilot_name, &qr_url, pdf)?;
    tauri::async_runtime::spawn_blocking(move || mail::send(&smtp, password.as_deref(), &message))
        .await
        .map_err(|e| AppError::Other(e.to_string()))??;
    if consent {
        state.emails.append(&EmailEntry {
            name: data.pilot_name.clone(),
            email,
            created_at: chrono::Local::now().to_rfc3339(),
        })?;
    }
    Ok(())
}

#[tauri::command]
pub async fn test_mail(state: State<'_, AppState>, pin: String, to: String) -> AppResult<()> {
    state.require_pin(&pin)?;
    let smtp = state.config()?.smtp.clone();
    let password = secrets::read_secret(&state.dir, SMTP_SECRET)?;
    let message = mail::test_message(&smtp.from, &to)?;
    tauri::async_runtime::spawn_blocking(move || mail::send(&smtp, password.as_deref(), &message))
        .await
        .map_err(|e| AppError::Other(e.to_string()))?
}

#[tauri::command]
pub fn email_count(state: State<'_, AppState>, pin: String) -> AppResult<usize> {
    state.require_pin(&pin)?;
    state.emails.count()
}

#[tauri::command]
pub async fn export_emails(app: AppHandle, state: State<'_, AppState>, pin: String) -> AppResult<Option<String>> {
    state.require_pin(&pin)?;
    let csv = state.emails.export_csv()?;
    save_with_dialog(&app, "codinglab-emails.csv", ("CSV", &["csv"]), csv.into_bytes()).await
}

#[tauri::command]
pub fn delete_emails(state: State<'_, AppState>, pin: String) -> AppResult<usize> {
    state.require_pin(&pin)?;
    state.emails.delete_all()
}

#[tauri::command]
pub fn save_session(state: State<'_, AppState>, record: SessionRecord) -> AppResult<()> {
    let retention = state.config()?.name_retention_days;
    state.history.insert(&record, retention, chrono::Utc::now().timestamp_millis())?;
    Ok(())
}

#[tauri::command]
pub fn list_records(state: State<'_, AppState>) -> AppResult<Vec<SessionRecord>> {
    state.history.all()
}

#[tauri::command]
pub fn peers(state: State<'_, AppState>) -> AppResult<Vec<PeerInfo>> {
    Ok(state.peers.list())
}

/// The frontend reports what this station shows, for the supervisor overview.
#[tauri::command]
pub fn publish_status(state: State<'_, AppState>, status: StationStatus) {
    state.sync.set_status(status);
}

/// Where a phone in the same network reaches this station's sync server.
#[tauri::command]
pub fn lan_urls() -> Vec<String> {
    sync::lan_addresses().into_iter().map(|ip| format!("http://{ip}:{}", sync::SYNC_PORT)).collect()
}

/// This station and every peer of its event, for the master's fleet view.
#[tauri::command]
pub async fn fleet(state: State<'_, AppState>) -> AppResult<Vec<FleetRow>> {
    Ok(sync::fleet_rows(&state.sync).await)
}

/// Master only: sends a command to the given stations (empty = all, this one included).
#[tauri::command]
pub async fn send_command(state: State<'_, AppState>, pin: String, targets: Vec<String>, command: RemoteCommand) -> AppResult<Vec<SendResult>> {
    remote::send(&state.sync, &pin, targets, command).await
}

#[tauri::command]
pub fn delete_history(state: State<'_, AppState>, pin: String) -> AppResult<usize> {
    state.require_pin(&pin)?;
    state.history.delete_all()
}

#[tauri::command]
pub async fn save_text_file(app: AppHandle, state: State<'_, AppState>, pin: String, file_name: String, contents: String) -> AppResult<Option<String>> {
    state.require_pin(&pin)?;
    save_with_dialog(&app, &file_name, ("CSV", &["csv"]), contents.into_bytes()).await
}
