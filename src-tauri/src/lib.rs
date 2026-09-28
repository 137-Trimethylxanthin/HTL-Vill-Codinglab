mod admin;
mod certificate;
mod commands;
mod config;
mod emails;
mod error;
mod history;
mod mail;
mod secrets;

use commands::AppState;
use std::sync::Mutex;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let dir = app.path().app_data_dir()?;
            let config = config::load(&dir)?;
            app.manage(AppState { emails: emails::EmailStore::new(&dir), config: Mutex::new(config), dir });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_config,
            commands::verify_pin,
            commands::set_pin,
            commands::save_config,
            commands::set_smtp_password,
            commands::save_certificate,
            commands::send_certificate,
            commands::test_mail,
            commands::email_count,
            commands::export_emails,
            commands::delete_emails,
        ])
        .run(tauri::generate_context!())
        .expect("error while running CodingLab");
}
