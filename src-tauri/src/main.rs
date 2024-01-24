// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::process::Command;
use tauri::api::path::document_dir;
use tauri::Runtime;
use std::time::SystemTime;
use std::fs;

fn get_sys_time_in_secs() -> u64 {
    match SystemTime::now().duration_since(SystemTime::UNIX_EPOCH) {
        Ok(n) => n.as_secs(),
        Err(_) => panic!("SystemTime before UNIX EPOCH!"),
    }
}

#[tauri::command]
async fn setup_user<R: Runtime>(app: tauri::AppHandle<R>, window: tauri::Window<R>, name: &str) -> Result<(), bool> {
    let filename = format!("{}_{}", name, get_sys_time_in_secs());
    let document_directory = document_dir().unwrap().push(filename);
    // println!("{}", document_directory.display());
    let resource_path = app.path_resolver()
        .resolve_resource("python/")
        .expect("failed to resolve resource");
    // fs::copy(resource_path, document_directory);
    Ok(())
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
        .invoke_handler(tauri::generate_handler![
            setup_user,
            open_code_with_filename
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}


