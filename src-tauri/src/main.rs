// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use pyo3::prelude::*;
use regex::Regex;
use std::path::Path;
use std::sync::Mutex;
use std::time::SystemTime;
use std::{fs, io};
use tauri::api::dialog::message;
use tauri::api::path::document_dir;
use tauri::api::process::Command as TCommand;
use tauri::{Runtime, State};

struct ApplicationState {
    name: Mutex<String>,
    dirname: Mutex<String>,
    level1_completed: Mutex<bool>,
    level2_completed: Mutex<bool>,
    level3_completed: Mutex<bool>,
    level1_time_completed: Mutex<usize>,
    level2_time_completed: Mutex<usize>,
    level3_time_completed: Mutex<usize>
}

struct PythonValidator;

impl PythonValidator {
    fn check_python() -> bool {
        let output = if cfg!(target_os = "windows") {
            TCommand::new("cmd")
                .args(["/C", "python --version"])
                .output()
                .expect("failed to execute process")
        } else {
            TCommand::new("sh")
                .args(["-c", "python --version"])
                .output()
                .expect("failed to execute process")
        };

        output.stdout.contains("Python 3")
    }

    fn replace_input_with_static(code: &str, level: usize) -> String {
        let input_pattern = Regex::new(r#"input\(".*?"\)"#).unwrap();
        if level == 1 {
            input_pattern.replace_all(code, "HTL").to_string()
        } else if level == 2 {
            let first_replaced = input_pattern.replace(code, "8");
            input_pattern.replace_all(&first_replaced, "4").to_string()
        } else {
            input_pattern.replace_all(code, "7").to_string()
        }
    }

    fn validate_python_syntax(file_path: &str, level: usize) -> bool {
        let python_code = fs::read_to_string(file_path);
        if python_code.is_err() {
            return false;
        }
        let python_code = python_code.unwrap();
        let python_code = PythonValidator::replace_input_with_static(&python_code, level);

        pyo3::prepare_freethreaded_python();
        Python::with_gil(|py| {
            match py.run(&python_code, None, None) {
                Ok(_) => return true,
                Err(_) => return false,
            };
        })
    }
}

struct VSCodeInstallation {}

impl VSCodeInstallation {
    fn get_installed_extensions() -> Vec<String> {
        let output = if cfg!(target_os = "windows") {
            TCommand::new("cmd")
                .args(["/C", "code --list-extensions"])
                .output()
                .expect("failed to execute process")
        } else {
            TCommand::new("sh")
                .args(["-c", "code --list-extensions"])
                .output()
                .expect("failed to execute process")
        };
        output.stdout.split("\n").map(|s| s.to_string()).collect()
    }

    fn install_extension(extension: &str) {
        let output = if cfg!(target_os = "windows") {
            TCommand::new("cmd")
                .args([
                    "/C",
                    format!("C: && code --install-extension {}", extension).as_str(),
                ])
                .output()
                .expect("failed to execute process")
        } else {
            TCommand::new("sh")
                .args([
                    "-c",
                    format!("code --install-extension {}", extension).as_str(),
                ])
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
            format!(
                "{}/Library/Application Support/Code/User/settings.json",
                home
            )
        } else {
            let home = std::env::var("HOME").unwrap();
            format!("{}/.config/Code/User/settings.json", home)
        };
        path
    }

    fn settings_disable_workspace_trust<R: Runtime>(window: &tauri::Window<R>) {
        let settings_path = VSCodeInstallation::get_settings_path();
        let settings_file = fs::read_to_string(settings_path.clone());
        if settings_file.is_err() {
            message(
                Some(window),
                "Coding Lab",
                "VSCode Einstellungs-datei nicht gefunden",
            );
            return;
        }
        let settings_file = settings_file.unwrap();
        // if settings json cant be parsed, show a warning and continue
        let settings_json = serde_json::from_str(&settings_file);
        if settings_json.is_ok() {
            let mut settings_json: serde_json::Value = settings_json.unwrap();
            settings_json["security.workspace.trust.enabled"] = serde_json::json!(false);
            let new_settings_file = serde_json::to_string_pretty(&settings_json).unwrap();
            fs::write(settings_path, new_settings_file).unwrap();
        } else {
            message(Some(&window), "Coding Lab", "Beim Lesen der Einstellungen ist ein Fehler aufgetreten. Dies ist nicht kritisch, es wird aber ein Prompt kommen");
        }
    }

    fn prepare_open<R: Runtime>(window: &tauri::Window<R>) {
        let installed_extensions = VSCodeInstallation::get_installed_extensions();
        let required_extensions = vec![
            "ms-python.python",
            "ms-python.vscode-pylance",
            "njpwerner.autodocstring",
        ];
        for extension in required_extensions {
            if !installed_extensions.contains(&extension.to_string()) {
                VSCodeInstallation::install_extension(extension);
            }
        }
        VSCodeInstallation::settings_disable_workspace_trust(&window);
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
fn setup_user<R: Runtime>(
    app: tauri::AppHandle<R>,
    window: tauri::Window<R>,
    state: State<'_, ApplicationState>,
    name: &str,
) -> Result<bool, String> {
    let mut state_name = state.name.lock().unwrap();
    if !state_name.is_empty() {
        return Ok(false);
    }
    let mut state_dirname = state.dirname.lock().unwrap();
    if !state_dirname.is_empty() {
        return Ok(false);
    }
    let dirname = format!("{}_{}", name, get_sys_time_in_secs());
    let document_directory = document_dir()
        .unwrap()
        .join("CodingLab")
        .join(dirname.clone());
    *state_name = name.to_string();
    *state_dirname = dirname;
    let resource_path = app
        .path_resolver()
        .resolve_resource("python/")
        .expect("failed to resolve resource");
    copy_dir_all(resource_path, document_directory).unwrap();
    VSCodeInstallation::prepare_open(&window);
    if !PythonValidator::check_python() {
        message(
            Some(&window),
            "Coding Lab",
            "Keine Python installation gefunden!",
        );
        println!("No python installation found!");
        return Ok(false);
    }
    Ok(true)
}

#[tauri::command]
fn logout(state: State<'_, ApplicationState>) -> Result<bool, String> {
    let mut state_name = state.name.lock().unwrap();
    let mut state_dirname = state.dirname.lock().unwrap();
    let mut state_level1_completed = state.level1_completed.lock().unwrap();
    let mut state_level2_completed = state.level2_completed.lock().unwrap();
    let mut state_level3_completed = state.level3_completed.lock().unwrap();
    let mut state_level1_time_completed = state.level1_time_completed.lock().unwrap();
    let mut state_level2_time_completed = state.level2_time_completed.lock().unwrap();
    let mut state_level3_time_completed = state.level3_time_completed.lock().unwrap();
    if state_name.is_empty() || state_dirname.is_empty() {
        return Ok(false);
    }
    *state_name = String::new();
    *state_dirname = String::new();
    *state_level1_completed = false;
    *state_level2_completed = false;
    *state_level3_completed = false;
    *state_level1_time_completed = 0;
    *state_level2_time_completed = 0;
    *state_level3_time_completed = 0;

    Ok(true)
}

#[tauri::command]
async fn get_name(state: State<'_, ApplicationState>) -> Result<String, String> {
    let state_name = state.name.lock().unwrap();
    Ok(state_name.clone())
}

#[tauri::command]
fn open_code_with_filename(
    _handle: tauri::AppHandle,
    state: State<'_, ApplicationState>,
    file_name: &str,
) -> Result<bool, String> {
    if state.name.lock().unwrap().is_empty() {
        return Ok(false);
    }
    let dirname = state.dirname.lock().unwrap();
    let file_open = document_dir()
        .unwrap()
        .join("CodingLab")
        .join(dirname.clone())
        .join(file_name);

    let output = if cfg!(target_os = "windows") {
        TCommand::new("cmd")
            .args(["/C", "code", file_open.to_str().unwrap()])
            .output()
            .expect("failed to execute process")
    } else {
        TCommand::new("sh")
            .args(["-c", "code", file_open.to_str().unwrap()])
            .output()
            .expect("failed to execute process")
    };

    println!("{:?}", output.stdout);
    Ok(true)
}

#[tauri::command]
fn check_python(state: State<'_, ApplicationState>, level: usize) -> Result<bool, String> {
    if state.name.lock().unwrap().is_empty() {
        return Ok(false);
    }
    if level < 1 || level > 3 {
        return Ok(false);
    }
    let dirname = state.dirname.lock().unwrap();
    let py_file = document_dir()
        .unwrap()
        .join("CodingLab")
        .join(dirname.clone())
        .join(format!("level{}.py", level));
    Ok(PythonValidator::validate_python_syntax(
        py_file.to_str().unwrap(),
        level,
    ))
}

#[tauri::command]
fn level_completed(state: State<'_, ApplicationState>, level: usize, time: usize) -> Result<bool, String> {
    if state.name.lock().unwrap().is_empty() {
        return Ok(false);
    }
    if level < 1 || level > 3 {
        return Ok(false);
    }
    if level == 1 {
        let mut level1_completed = state.level1_completed.lock().unwrap();
        if *level1_completed {
            return Ok(false);
        }
        *level1_completed = true;
        let mut level1_time_completed = state.level1_time_completed.lock().unwrap();
        *level1_time_completed = time;
    } else if level == 2 {
        let mut level2_completed = state.level2_completed.lock().unwrap();
        if *level2_completed {
            return Ok(false);
        }
        *level2_completed = true;
        let mut level2_time_completed = state.level2_time_completed.lock().unwrap();
        *level2_time_completed = time;
    } else {
        let mut level3_completed = state.level3_completed.lock().unwrap();
        if *level3_completed {
            return Ok(false);
        }
        *level3_completed = true;
        let mut level3_time_completed = state.level3_time_completed.lock().unwrap();
        *level3_time_completed = time;
    }
    Ok(true)
}

#[tauri::command]
fn get_levels(state: State<'_, ApplicationState>) -> Result<(Vec<bool>, Vec<usize>), String> {
    if state.name.lock().unwrap().is_empty() {
        return Ok((vec![false, false, false], vec![0, 0, 0]));
    }
    let level1_completed = *state.level1_completed.lock().unwrap();
    let level2_completed = *state.level2_completed.lock().unwrap();
    let level3_completed = *state.level3_completed.lock().unwrap();
    let level1_time_completed = *state.level1_time_completed.lock().unwrap();
    let level2_time_completed = *state.level2_time_completed.lock().unwrap();
    let level3_time_completed = *state.level3_time_completed.lock().unwrap();
    Ok((
        vec![level1_completed, level2_completed, level3_completed],
        vec![level1_time_completed, level2_time_completed, level3_time_completed],
    ))
}

fn main() {
    tauri::Builder::default()
        .manage(ApplicationState {
            name: Mutex::new(String::new()),
            dirname: Mutex::new(String::new()),
            level1_completed: Mutex::new(false),
            level2_completed: Mutex::new(false),
            level3_completed: Mutex::new(false),
            level1_time_completed: Mutex::new(0),
            level2_time_completed: Mutex::new(0),
            level3_time_completed: Mutex::new(0)
        })
        .invoke_handler(tauri::generate_handler![
            setup_user,
            logout,
            get_name,
            open_code_with_filename,
            check_python,
            level_completed,
            get_levels,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
