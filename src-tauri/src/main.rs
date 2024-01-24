// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::process::Command;


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
        .invoke_handler(tauri::generate_handler![open_code_with_filename])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}


