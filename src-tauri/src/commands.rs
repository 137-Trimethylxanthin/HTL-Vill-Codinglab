use crate::admin;
use crate::certificate::{self, CertificateData};
use crate::config::{self, EditableConfig, PublicConfig, StationConfig};
use crate::emails::{EmailEntry, EmailStore};
use crate::error::{AppError, AppResult};
use crate::mail;
use crate::secrets::{self, SMTP_SECRET};
use std::path::PathBuf;
use std::sync::{Mutex, MutexGuard};
use tauri::{AppHandle, State};
use tauri_plugin_dialog::DialogExt;

pub struct AppState {
    pub dir: PathBuf,
    pub config: Mutex<StationConfig>,
    pub emails: EmailStore,
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

#[tauri::command]
pub fn save_config(state: State<'_, AppState>, pin: String, config: EditableConfig) -> AppResult<PublicConfig> {
    let mut cfg = state.config()?;
    admin::require_pin(cfg.pin_hash.as_deref(), &pin)?;
    cfg.apply(config);
    config::save(&state.dir, &cfg)?;
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
