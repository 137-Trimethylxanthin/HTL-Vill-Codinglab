// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::process::Command;
use tauri::api::path::document_dir;
use tauri::{Runtime, State};
use std::time::SystemTime;
use std::{fs, io};
use std::path::Path;
use std::sync::Mutex;

struct ApplicationState {
    name: Mutex<String>,
    dirname: Mutex<String>,
}

struct VSCodeInstallation {}

impl VSCodeInstallation {
    fn get_installed_extensions() -> Vec<String> {
        let output = if cfg!(target_os = "windows") {
            Command::new("cmd")
                .args(["/C", "code --list-extensions"])
                .output()
                .expect("failed to execute process")
        } else {
            Command::new("sh")
                .arg("-c")
                .arg("code --list-extensions")
                .output()
                .expect("failed to execute process")
        };

        let output_string = String::from_utf8(output.stdout).unwrap();
        output_string.split("\n").map(|s| s.to_string()).collect()
    }

    fn install_extension(extension: &str) {
        let output = if cfg!(target_os = "windows") {
            Command::new("cmd")
                .args(["/C", format!("code --install-extension {}", extension).as_str()])
                .output()
                .expect("failed to execute process")
        } else {
            Command::new("sh")
                .arg("-c")
                .arg(format!("code --install-extension {}", extension).as_str())
                .output()
                .expect("failed to execute process")
        };

        println!("{:?}", output.stdout);
    }

    fn get_settings_path() -> String {
        let path = if cfg!(target_os = "windows") {
            let appdata = std::env::var("APPDATA").unwrap();
            format!("{}\\Code\\User\\settings.json", appdata)
        } else if cfg!(target_os = "macos") {
            let home = std::env::var("HOME").unwrap();
            format!("{}/Library/Application Support/Code/User/settings.json", home)
        } else {
            let home = std::env::var("HOME").unwrap();
            format!("{}/.config/Code/User/settings.json", home)
        };
        path
    }

    fn settings_disable_workspace_trust() {
        let settings_path = VSCodeInstallation::get_settings_path();
        let settings_file = fs::read_to_string(settings_path.clone()).unwrap();
        let mut settings_json: serde_json::Value = serde_json::from_str(&settings_file).unwrap();
        settings_json["security.workspace.trust.enabled"] = serde_json::json!(false);
        let new_settings_file = serde_json::to_string_pretty(&settings_json).unwrap();
        fs::write(settings_path, new_settings_file).unwrap();
    }

    fn prepare_open() {
        let installed_extensions = VSCodeInstallation::get_installed_extensions();
        let required_extensions = vec![
            "ms-python.python",
            "ms-python.vscode-pylance",
            "njpwerner.autodocstring"
        ];
        for extension in required_extensions {
            if !installed_extensions.contains(&extension.to_string()) {
                VSCodeInstallation::install_extension(extension);
            }
        }
        // VSCodeInstallation::settings_disable_workspace_trust(); TODO: Fix this, it is broken
    }
}

fn get_sys_time_in_secs() -> u64 {
    match SystemTime::now().duration_since(SystemTime::UNIX_EPOCH) {
        Ok(n) => n.as_secs(),
        Err(_) => panic!("SystemTime before UNIX EPOCH!"),
    }
}

fn copy_dir_all(src: impl AsRef<Path>, dst: impl AsRef<Path>) -> io::Result<()> {
    fs::create_dir_all(&dst)?;
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let ty = entry.file_type()?;
        if ty.is_dir() {
            copy_dir_all(entry.path(), dst.as_ref().join(entry.file_name()))?;
        } else {
            fs::copy(entry.path(), dst.as_ref().join(entry.file_name()))?;
        }
    }
    Ok(())
}

#[tauri::command]
async fn setup_user<R: Runtime>(app: tauri::AppHandle<R>, window: tauri::Window<R>, state: State<'_, ApplicationState>, name: &str) -> Result<bool, String> {
    let mut state_name = state.name.lock().unwrap();
    if !state_name.is_empty() {
        return Ok(false);
    }
    let mut state_dirname = state.dirname.lock().unwrap();
    if !state_dirname.is_empty() {
        return Ok(false);
    }
    let dirname = format!("{}_{}", name, get_sys_time_in_secs());
    let document_directory = document_dir().unwrap().join("Programmierwerkstatt").join(dirname.clone());
    *state_name = name.to_string();
    *state_dirname = dirname;
    // println!("{}", document_directory.display());
    let resource_path = app.path_resolver()
        .resolve_resource("python/")
        .expect("failed to resolve resource");
    copy_dir_all(resource_path, document_directory).unwrap();
    VSCodeInstallation::prepare_open();
    Ok(true)
}

#[tauri::command]
fn open_code_with_filename(handle: tauri::AppHandle, file_name: &str) {
    let resource_path = handle.path_resolver()
        .resolve_resource(format!("python/{}",file_name))
        .expect("failed to resolve resource");

    let output = if cfg!(target_os = "windows") {
        Command::new("cmd")
            .args(["/C", format!("code {}", resource_path.to_str().unwrap()).as_str()])
            .output()
            .expect("failed to execute process")
    } else {
        Command::new("sh")
            .arg("-c")
            .arg(format!("code {}", resource_path.to_str().unwrap()).as_str())
            .output()
            .expect("failed to execute process")
    };

    println!("{:?}", output.stdout);
}


fn main() {
    tauri::Builder::default()
        .manage(ApplicationState {
            name: Mutex::new(String::new()),
            dirname: Mutex::new(String::new()),
        })
        .invoke_handler(tauri::generate_handler![
            setup_user,
            open_code_with_filename
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
