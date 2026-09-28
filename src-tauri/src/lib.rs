mod admin;
mod certificate;
mod commands;
mod config;
mod emails;
mod error;
mod history;
mod mail;
mod secrets;
mod sync;

use commands::AppState;
use std::sync::Mutex;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            #[cfg(desktop)]
            {
                app.handle().plugin(tauri_plugin_updater::Builder::new().build())?;
                app.handle().plugin(tauri_plugin_process::init())?;
            }
            let dir = app.path().app_data_dir()?;
            let config = std::sync::Arc::new(Mutex::new(config::load(&dir)?));
            let history = std::sync::Arc::new(history::History::open(&dir.join("history.sqlite"))?);
            let peers = sync::start(std::sync::Arc::new(sync::Shared { history: history.clone(), config: config.clone() }));
            let config_for_window = config.clone();
            app.manage(AppState { emails: emails::EmailStore::new(&dir), config, dir, history, peers });
            if let Ok(cfg) = config_for_window.lock() {
                commands::apply_window(app.handle(), &cfg);
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_config,
            commands::platform_info,
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
            commands::save_session,
            commands::list_records,
            commands::peers,
            commands::delete_history,
            commands::save_text_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running CodingLab");
}
