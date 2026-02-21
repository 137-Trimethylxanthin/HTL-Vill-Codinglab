// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs::{File, OpenOptions};
use std::io::BufWriter;
use std::path::Path;
use std::sync::Mutex;
use std::time::SystemTime;
use std::{fs, io::{self, Write}};
use lettre::message::{MultiPart, SinglePart};
use lettre::transport::smtp::authentication::Credentials;
use lettre::{Message, SmtpTransport, Transport};
use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce, Key
};
use rand::Rng;
use printpdf::{BuiltinFont, Mm, Op, PdfDocument, PdfFontHandle, PdfPage, PdfSaveOptions, Pt, RawImage, TextItem, TextMatrix, XObjectTransform};
use serde::{Deserialize, Serialize};
use tauri_plugin_dialog::DialogExt;
use tauri::path::BaseDirectory;
use tauri::{Manager, Runtime, State};
use tauri_plugin_shell::ShellExt;

struct ApplicationState {
    name: Mutex<String>,
    dirname: Mutex<String>,
    level1_completed: Mutex<bool>,
    level2_completed: Mutex<bool>,
    level3_completed: Mutex<bool>,
    level1_time_completed: Mutex<usize>,
    level2_time_completed: Mutex<usize>,
    level3_time_completed: Mutex<usize>,
    level1_score: Mutex<usize>,
    level2_score: Mutex<usize>,
    level3_score: Mutex<usize>,
}

/*
    Scoring System:
    - max 100 points, min 0 points
    - 45% is the ratio of completed / total excercises
    - 15% is error penalty
    - 40% is time penalty
*/
struct ScoreCalculator {}

impl ScoreCalculator {
    fn calculate_score(
        time: usize,
        max_time: usize,
        errors: usize,
        max_error_penalty: usize,
        sublevels_completed: usize,
        total_sublevels: usize,
    ) -> usize {
        let time_ratio = (time as f64 / max_time as f64).min(2.0); // cap at 2x time penalty
        let error_ratio = errors as f64 / max_error_penalty as f64;
        let time_score = if time_ratio > 1.0 {
            40.0 * (1.0 - (time_ratio - 1.0))
        } else {
            40.0
        };
        let error_score = 15.0 * (1.0 - error_ratio).max(0.0);
        let completion_score = 45.0; // completion score is always 45% for now as it will be detucted later
        ((time_score + error_score + completion_score).round() as usize) / total_sublevels * sublevels_completed
    }
}

struct Mailer {}

impl Mailer {
    fn send_mail(smtp_credentials: SmtpCredentials, from: &str, to: &str, subject: &str, html: &str) -> Result<(), Box<dyn std::error::Error>> {
        let email = Message::builder()
            .from(from.parse()?)
            .to(to.parse()?)
            .subject(subject)
            .multipart(
                MultiPart::alternative()
                    .singlepart(
                        SinglePart::html(html.to_string())
                    )
            )?;
        let creds = Credentials::new(smtp_credentials.username, smtp_credentials.password);
        let mailer = SmtpTransport::starttls_relay(&smtp_credentials.url)?
            .credentials(creds)
            .build();

        match mailer.send(&email) {
            Ok(_) => Ok(()),
            Err(e) => Err(Box::new(e))
        }
    }
}

struct VSCodeInstallation {}

impl VSCodeInstallation {
    async fn get_installed_extensions<R: Runtime>(app: &tauri::AppHandle<R>) -> Vec<String> {
        let output = if cfg!(target_os = "windows") {
            app.shell().command("cmd")
                .args(["/C", "code --list-extensions"])
                .output()
                .await
                .expect("failed to execute process")
        } else {
            app.shell().command("sh")
                .args(["-c", "code --list-extensions"])
                .output()
                .await
                .expect("failed to execute process")
        };
        output.stdout.split(|&x| x == b'\n' || x == b'\r')
            .filter(|&x| !x.is_empty())
            .map(|x| String::from_utf8(x.to_vec()).unwrap())
            .collect()
    }

    async fn install_extension<R: Runtime>(extension: &str, app: &tauri::AppHandle<R>) {
        let output = if cfg!(target_os = "windows") {
            app.shell().command("cmd")
                .args([
                    "/C",
                    format!("C: && code --install-extension {}", extension).as_str(),
                ])
                .output()
                .await
                .expect("failed to execute process")
        } else {
            app.shell().command("sh")
                .args([
                    "-c",
                    format!("code --install-extension {}", extension).as_str(),
                ])
                .output()
                .await
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

    fn settings_disable_workspace_trust<R: Runtime>(app: &tauri::AppHandle<R>) {
        let settings_path = VSCodeInstallation::get_settings_path();
        let settings_file = fs::read_to_string(settings_path.clone());
        if settings_file.is_err() {
            app.dialog().message(
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
            app.dialog().message("Beim Lesen der Einstellungen ist ein Fehler aufgetreten. Dies ist nicht kritisch, es wird aber ein Prompt kommen");
        }
    }

    async fn prepare_open<R: Runtime>(app: tauri::AppHandle<R>) {
        println!("Preparing to open VSCode...");
        let installed_extensions = VSCodeInstallation::get_installed_extensions(&app).await;
        let required_extensions = vec![
            "ms-python.python",
            "ms-python.vscode-pylance",
            "njpwerner.autodocstring",
        ];
        for extension in required_extensions {
            if !installed_extensions.contains(&extension.to_string()) {
                VSCodeInstallation::install_extension(extension, &app).await;
            }
        }
        VSCodeInstallation::settings_disable_workspace_trust(&app);
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

fn append_email_name_to_file<R: Runtime>(app: &tauri::AppHandle<R>, email: &str, name: &str) -> Result<(), Box<dyn std::error::Error>> {
    let app_data_dir = app.path().app_data_dir().unwrap();
    let file_path = app_data_dir.join("emails.txt");

    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(file_path)?;

    writeln!(file, "{} <{}>", name, email)?;

    Ok(())
}

#[derive(Serialize, Deserialize)]
struct SmtpCredentials {
    url: String,
    username: String,
    password: String,
}

#[derive(Serialize, Deserialize)]
struct EncryptedData {
    ciphertext: Vec<u8>,
    nonce: [u8; 12],
}

#[derive(Serialize)]
struct CertificatePayload {
    path: String,
    pdf_bytes: Vec<u8>,
}

fn encrypt_credentials(credentials: &SmtpCredentials, key: &[u8; 32]) -> EncryptedData {
    let cipher = Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(key));
    let mut rng = rand::rng();
    let mut nonce = [0u8; 12];
    rng.fill(&mut nonce);
    let nonce = Nonce::from_slice(&nonce);
    
    let plaintext = serde_json::to_string(credentials).unwrap().into_bytes();
    let ciphertext = cipher.encrypt(nonce, plaintext.as_ref()).unwrap();
    
    EncryptedData {
        ciphertext,
        nonce: *nonce.as_ref(),
    }
}

fn decrypt_credentials(encrypted: &EncryptedData, key: &[u8; 32]) -> Result<SmtpCredentials, std::io::Error> {
    let cipher = Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(key));
    let nonce = Nonce::from_slice(&encrypted.nonce);
    
    let plaintext = cipher.decrypt(nonce, encrypted.ciphertext.as_ref()).map_err(|_| std::io::ErrorKind::InvalidData)?;
    let credentials: SmtpCredentials = serde_json::from_slice(&plaintext)?;
    
    Ok(credentials)
}

fn save_credentials<R: Runtime>(app: tauri::AppHandle<R>, credentials: &SmtpCredentials) -> Result<(), Box<dyn std::error::Error>> {
    let app_data_dir = app.path().app_data_dir().unwrap();
    std::fs::create_dir_all(&app_data_dir)?;

    let mut rng = rand::rng();
    let key: [u8; 32] = rng.random();
    let encrypted = encrypt_credentials(credentials, &key);

    let encrypted_data = serde_json::to_vec(&encrypted)?;
    std::fs::write(app_data_dir.join("smtp_credentials.enc"), encrypted_data)?;
    std::fs::write(app_data_dir.join("encryption_key"), key)?;

    Ok(())
}

fn load_credentials<R: Runtime>(app: &tauri::AppHandle<R>) -> Result<SmtpCredentials, std::io::Error> {
    let app_data_dir = app.path().app_data_dir().unwrap();

    let encrypted_data = fs::read(app_data_dir.join("smtp_credentials.enc"))?;
    let key = fs::read(app_data_dir.join("encryption_key"))?;

    let encrypted: EncryptedData = serde_json::from_slice(&encrypted_data)?;
    let key: [u8; 32] = key.try_into().map_err(|_| std::io::ErrorKind::InvalidData)?;

    decrypt_credentials(&encrypted, &key)
}

#[tauri::command]
fn store_smtp_credentials<R: Runtime>(app: tauri::AppHandle<R>, url: String, username: String, password: String) -> Result<(), String> {
    let credentials = SmtpCredentials { url, username, password };
    save_credentials(app, &credentials).map_err(|e| e.to_string())
}

#[tauri::command]
fn has_smtp_credentials<R: Runtime>(app: tauri::AppHandle<R>) -> bool {
    let app_data_dir = app.path().app_data_dir().unwrap();
    app_data_dir.join("smtp_credentials.enc").exists() && app_data_dir.join("encryption_key").exists()
}

#[tauri::command]
fn setup_user<R: Runtime>(
    app: tauri::AppHandle<R>,
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
    let document_directory = app.path().document_dir()
        .unwrap()
        .join("CodingLab")
        .join(dirname.clone());
    *state_name = name.to_string();
    *state_dirname = dirname;
    let resource_path = app
        .path()
        .resolve("python/", BaseDirectory::Resource)
        .expect("failed to resolve resource");
    copy_dir_all(resource_path, document_directory).unwrap();
    let app_for_prepare = app.clone();
    tauri::async_runtime::spawn(async move {
        VSCodeInstallation::prepare_open(app_for_prepare).await;
    });
    // if !PythonValidator::check_python() {
    //     message(
    //         Some(&window),
    //         "Coding Lab",
    //         "Keine Python installation gefunden!",
    //     );
    //     println!("No python installation found!");
    //     return Ok(false);
    // }
    Ok(true)
}

#[tauri::command]
fn send_mail<R: Runtime>(app: tauri::AppHandle<R>, state: State<'_, ApplicationState>, email: &str) -> Result<bool, String> {
    if email.is_empty() {
        return Ok(false);
    }
    let smtp_credentials = load_credentials(&app).map_err(|e| e.to_string())?;
    let sender_email = smtp_credentials.username.clone();
    let name = state.name.lock().unwrap().clone();
    if name.is_empty() {
        return Ok(false);
    }
    if let Err(e) = append_email_name_to_file(&app, email, name.as_str()) {
        return Err(e.to_string());
    }
    let level1_completed = *state.level1_completed.lock().unwrap();
    let level2_completed = *state.level2_completed.lock().unwrap();
    let level3_completed = *state.level3_completed.lock().unwrap();
    let level1_time_completed = *state.level1_time_completed.lock().unwrap();
    let level2_time_completed = *state.level2_time_completed.lock().unwrap();
    let level3_time_completed = *state.level3_time_completed.lock().unwrap();
    let level1_score = *state.level1_score.lock().unwrap();
    let level2_score = *state.level2_score.lock().unwrap();
    let level3_score = *state.level3_score.lock().unwrap();
    Mailer::send_mail(
        smtp_credentials,
        format!("Coding Lab <{}>", sender_email).as_str(),
        format!("{} <{}>", name, email).as_str(),
        "Coding Lab - Ergebnisse",
        format!(r#"
            <html>
                <head>
                    <style>
                        body {{
                            font-family: Arial, sans-serif;
                        }}
                        .container {{
                            width: 80%;
                            margin: 0 auto;
                        }}
                        .header {{
                            background-color: #f1f1f1;
                            padding: 10px;
                            text-align: center;
                        }}
                        .content {{
                            padding: 10px;
                        }}
                        .footer {{
                            background-color: #f1f1f1;
                            padding: 10px;
                            text-align: center;
                        }}
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <img src="https://gitlab.com/uploads/-/system/group/avatar/12594023/logo.png?width=512" alt="HTL Logo" width="100" height="100">
                            <h1>Coding Lab - Ergebnisse</h1>
                        </div>
                        <div class="content">
                            <p>Liebe/r {name},</p>
                            <p>Vielen Dank, dass du beim Coding Lab der HTL Villach teilgenommen hast. Hier sind deine Ergebnisse:</p>
                            <ul>
                                <li>Level 1: {level1_completed} ({level1_time_completed} Sekunden, {level1_score} Punkte)</li>
                                <li>Level 2: {level2_completed} ({level2_time_completed} Sekunden, {level2_score} Punkte)</li>
                                <li>Level 3: {level3_completed} ({level3_time_completed} Sekunden, {level3_score} Punkte)</li>
                            </ul>
                            <p>Dein Gesamtpunktestand beträgt {score} / 300 Punkten.</p>
                            <p>Vielen Dank für deine Teilnahme!</p>
                        </div>
                        <div class="footer">
                            <p>Coding Lab - HTL Villach Informatik</p>
                        </div>
                    </div>
                </body>
            </html>
        "#,
            name = name,
            level1_completed = if level1_completed { "Abgeschlossen" } else { "Nicht abgeschlossen" },
            level1_time_completed = level1_time_completed,
            level2_completed = if level2_completed { "Abgeschlossen" } else { "Nicht abgeschlossen" },
            level2_time_completed = level2_time_completed,
            level3_completed = if level3_completed { "Abgeschlossen" } else { "Nicht abgeschlossen" },
            level3_time_completed = level3_time_completed,
            level1_score = level1_score,
            level2_score = level2_score,
            level3_score = level3_score,
            score = level1_score + level2_score + level3_score,
        ).as_str(),
    ).map_err(|e| e.to_string())?;
    
    Ok(true)
}

#[tauri::command]
fn create_certificate<R: Runtime>(
    app: tauri::AppHandle<R>,
    state: State<'_, ApplicationState>,
    name: &str,
) -> Result<CertificatePayload, String> {
    let state_name = state.name.lock().unwrap().clone();
    if state_name.is_empty() {
        return Err("Kein aktiver Benutzer gefunden".to_string());
    }

    let certificate_name = name.trim();
    if certificate_name.len() < 3 {
        return Err("Name muss mindestens 3 Zeichen lang sein".to_string());
    }

    let safe_name = certificate_name
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || c == '-' || c == '_' {
                c
            } else {
                '_'
            }
        })
        .collect::<String>();
    let file_name = format!("certificate_{}_{}.pdf", safe_name, get_sys_time_in_secs());

    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&app_data_dir).map_err(|e| e.to_string())?;
    let certificate_path = app_data_dir.join(file_name);

    let level1_completed = *state.level1_completed.lock().unwrap();
    let level2_completed = *state.level2_completed.lock().unwrap();
    let level3_completed = *state.level3_completed.lock().unwrap();
    let level1_time_completed = *state.level1_time_completed.lock().unwrap();
    let level2_time_completed = *state.level2_time_completed.lock().unwrap();
    let level3_time_completed = *state.level3_time_completed.lock().unwrap();
    let level1_score = *state.level1_score.lock().unwrap();
    let level2_score = *state.level2_score.lock().unwrap();
    let level3_score = *state.level3_score.lock().unwrap();
    let total_score = level1_score + level2_score + level3_score;

    let mut doc = PdfDocument::new("Coding Lab Certificate");
    let page_width = Mm(210.0);
    let page_height = Mm(297.0);
    let mut ops = Vec::new();
    let mut warnings = Vec::new();

    let fmt_time = |seconds: usize| -> String { format!("{:02}:{:02}", seconds / 60, seconds % 60) };
    let status_text = |completed: bool| if completed { "Abgeschlossen" } else { "Nicht abgeschlossen" };

    if let Ok(logo) = RawImage::decode_from_bytes(include_bytes!("../icons/icon.png"), &mut warnings) {
        let logo_id = doc.add_image(&logo);
        ops.push(Op::UseXobject {
            id: logo_id,
            transform: XObjectTransform {
                translate_x: Some(Mm(190.0).into()),
                translate_y: Some(Mm(278.0).into()),
                rotate: None,
                scale_x: Some(0.4),
                scale_y: Some(0.4),
                dpi: Some(300.0),
            },
        });
    }

    ops.push(Op::StartTextSection);
    ops.push(Op::SetFont {
        size: Pt(12.0),
        font: PdfFontHandle::Builtin(BuiltinFont::HelveticaBold),
    });
    ops.push(Op::SetTextMatrix {
        matrix: TextMatrix::Translate(Mm(20.0).into(), Mm(278.0).into()),
    });
    ops.push(Op::ShowText {
        items: vec![TextItem::Text("HTL Villach Informatik".to_string())],
    });
    ops.push(Op::SetFont {
        size: Pt(34.0),
        font: PdfFontHandle::Builtin(BuiltinFont::HelveticaBold),
    });
    ops.push(Op::SetTextMatrix {
        matrix: TextMatrix::Translate(Mm(20.0).into(), Mm(248.0).into()),
    });
    ops.push(Op::ShowText {
        items: vec![TextItem::Text("Zertifikat".to_string())],
    });
    ops.push(Op::SetFont {
        size: Pt(18.0),
        font: PdfFontHandle::Builtin(BuiltinFont::Helvetica),
    });
    ops.push(Op::SetTextMatrix {
        matrix: TextMatrix::Translate(Mm(20.0).into(), Mm(230.0).into()),
    });
    ops.push(Op::ShowText {
        items: vec![TextItem::Text(
            "Dieses Zertifikat bestaetigt die Teilnahme".to_string(),
        )],
    });
    ops.push(Op::SetTextMatrix {
        matrix: TextMatrix::Translate(Mm(20.0).into(), Mm(220.0).into()),
    });
    ops.push(Op::ShowText {
        items: vec![TextItem::Text("am Coding Lab der HTL Villach.".to_string())],
    });
    ops.push(Op::SetFont {
        size: Pt(26.0),
        font: PdfFontHandle::Builtin(BuiltinFont::HelveticaBold),
    });
    ops.push(Op::SetTextMatrix {
        matrix: TextMatrix::Translate(Mm(20.0).into(), Mm(198.0).into()),
    });
    ops.push(Op::ShowText {
        items: vec![TextItem::Text(certificate_name.to_string())],
    });
    ops.push(Op::SetFont {
        size: Pt(16.0),
        font: PdfFontHandle::Builtin(BuiltinFont::Helvetica),
    });
    ops.push(Op::SetTextMatrix {
        matrix: TextMatrix::Translate(Mm(20.0).into(), Mm(176.0).into()),
    });
    ops.push(Op::ShowText {
        items: vec![TextItem::Text(format!(
            "Erreichte Gesamtpunkte: {} / 300",
            total_score
        ))],
    });

    ops.push(Op::SetTextMatrix {
        matrix: TextMatrix::Translate(Mm(20.0).into(), Mm(156.0).into()),
    });
    ops.push(Op::ShowText {
        items: vec![TextItem::Text(format!(
            "Level 1: {} ({}, {} Punkte)",
            status_text(level1_completed),
            fmt_time(level1_time_completed),
            level1_score
        ))],
    });
    ops.push(Op::SetTextMatrix {
        matrix: TextMatrix::Translate(Mm(20.0).into(), Mm(146.0).into()),
    });
    ops.push(Op::ShowText {
        items: vec![TextItem::Text(format!(
            "Level 2: {} ({}, {} Punkte)",
            status_text(level2_completed),
            fmt_time(level2_time_completed),
            level2_score
        ))],
    });
    ops.push(Op::SetTextMatrix {
        matrix: TextMatrix::Translate(Mm(20.0).into(), Mm(136.0).into()),
    });
    ops.push(Op::ShowText {
        items: vec![TextItem::Text(format!(
            "Level 3: {} ({}, {} Punkte)",
            status_text(level3_completed),
            fmt_time(level3_time_completed),
            level3_score
        ))],
    });

    ops.push(Op::SetTextMatrix {
        matrix: TextMatrix::Translate(Mm(20.0).into(), Mm(28.0).into()),
    });
    ops.push(Op::ShowText {
        items: vec![TextItem::Text("HTL Villach - Coding Lab".to_string())],
    });
    ops.push(Op::EndTextSection);

    let page = PdfPage::new(page_width, page_height, ops);
    doc.with_pages(vec![page]);

    let opts = PdfSaveOptions::default();
    let pdf_bytes = doc.save(&opts, &mut warnings);
    let mut writer = BufWriter::new(File::create(&certificate_path).map_err(|e| e.to_string())?);
    writer.write_all(&pdf_bytes).map_err(|e| e.to_string())?;

    Ok(CertificatePayload {
        path: certificate_path.to_string_lossy().to_string(),
        pdf_bytes,
    })
}

#[tauri::command]
fn logout(state: State<'_, ApplicationState>) -> Result<bool, String> {
    let mut state_name = state.name.lock().unwrap();
    let mut state_dirname = state.dirname.lock().unwrap();
    if state_name.is_empty() {
        return Ok(false);
    }
    if state_dirname.is_empty() {
        return Ok(false);
    }
    let mut state_level1_completed = state.level1_completed.lock().unwrap();
    let mut state_level2_completed = state.level2_completed.lock().unwrap();
    let mut state_level3_completed = state.level3_completed.lock().unwrap();
    let mut state_level1_time_completed = state.level1_time_completed.lock().unwrap();
    let mut state_level2_time_completed = state.level2_time_completed.lock().unwrap();
    let mut state_level3_time_completed = state.level3_time_completed.lock().unwrap();
    let mut state_level1_score = state.level1_score.lock().unwrap();
    let mut state_level2_score = state.level2_score.lock().unwrap();
    let mut state_level3_score = state.level3_score.lock().unwrap();

    *state_name = String::new();
    *state_dirname = String::new();
    *state_level1_completed = false;
    *state_level2_completed = false;
    *state_level3_completed = false;
    *state_level1_time_completed = 0;
    *state_level2_time_completed = 0;
    *state_level3_time_completed = 0;
    *state_level1_score = 0;
    *state_level2_score = 0;
    *state_level3_score = 0;

    Ok(true)
}

#[tauri::command]
async fn get_name(state: State<'_, ApplicationState>) -> Result<String, String> {
    let state_name = state.name.lock().unwrap();
    Ok(state_name.clone())
}

#[tauri::command]
fn open_code_with_filename(
    app: tauri::AppHandle,
    state: State<'_, ApplicationState>,
    file_name: &str,
) -> Result<bool, String> {
    if state.name.lock().unwrap().is_empty() {
        return Ok(false);
    }
    let dirname = state.dirname.lock().unwrap();
    let file_open = app.path().document_dir()
        .unwrap()
        .join("CodingLab")
        .join(dirname.clone())
        .join(file_name);

    let output = if cfg!(target_os = "windows") {
        tauri::async_runtime::block_on(async move {
            app.shell().command("cmd")
                .args(["/C", &format!("code --disable-workspace-trust {}", file_open.to_str().unwrap())])
                .output()
                .await
                .expect("failed to execute process")
        })
    } else {
        tauri::async_runtime::block_on(async move {
            app.shell().command("sh")
                .args(["-c", &format!("code --disable-workspace-trust {}", file_open.to_str().unwrap())])
                .output()
                .await
                .expect("failed to execute process")
        })
    };

    println!("{:?}", output.stdout);
    Ok(true)
}

#[tauri::command]
fn check_python(state: State<'_, ApplicationState>, level: usize) -> Result<bool, String> {
    if state.name.lock().unwrap().is_empty() {
        return Ok(false);
    }
    if !(1..=3).contains(&level) {
        return Ok(false);
    }
    // let dirname = state.dirname.lock().unwrap();
    // let py_file = document_dir()
    //     .unwrap()
    //     .join("CodingLab")
    //     .join(dirname.clone())
    //     .join(format!("level{}.py", level));
    Ok(true) // just accept it, there is another person
}

#[tauri::command]
fn level_completed(
    state: State<'_, ApplicationState>,
    level: usize,
    time: usize,
    errors: usize,
    sublevels_completed: usize,
    total_sublevels: usize,
) -> Result<(bool, usize), String> {
    if state.name.lock().unwrap().is_empty() {
        return Ok((false, 0));
    }
    if !(1..=3).contains(&level) {
        return Ok((false, 0));
    }
    const MAX_TIME: usize = 500;
    const MAX_ERROR_PENALTY: usize = 5;
    let score = if level == 1 {
        let mut level1_completed = state.level1_completed.lock().unwrap();
        if *level1_completed {
            return Ok((false, 0));
        }
        *level1_completed = true;
        let mut level1_time_completed = state.level1_time_completed.lock().unwrap();
        *level1_time_completed = time;
        let calculated_score = ScoreCalculator::calculate_score(
            time,
            MAX_TIME,
            errors,
            MAX_ERROR_PENALTY,
            sublevels_completed,
            total_sublevels,
        );
        let mut level1_score = state.level1_score.lock().unwrap();
        *level1_score = calculated_score;
        calculated_score
    } else if level == 2 {
        let mut level2_completed = state.level2_completed.lock().unwrap();
        if *level2_completed {
            return Ok((false, 0));
        }
        *level2_completed = true;
        let mut level2_time_completed = state.level2_time_completed.lock().unwrap();
        *level2_time_completed = time;
        let calculated_score = ScoreCalculator::calculate_score(
            time,
            MAX_TIME,
            errors,
            MAX_ERROR_PENALTY,
            sublevels_completed,
            total_sublevels,
        );
        let mut level2_score = state.level2_score.lock().unwrap();
        *level2_score = calculated_score;
        calculated_score
    } else {
        let mut level3_completed = state.level3_completed.lock().unwrap();
        if *level3_completed {
            return Ok((false, 0));
        }
        *level3_completed = true;
        let mut level3_time_completed = state.level3_time_completed.lock().unwrap();
        *level3_time_completed = time;
        let calculated_score = ScoreCalculator::calculate_score(
            time,
            MAX_TIME,
            errors,
            MAX_ERROR_PENALTY,
            sublevels_completed,
            total_sublevels,
        );
        let mut level3_score = state.level3_score.lock().unwrap();
        *level3_score = calculated_score;
        calculated_score
    };
    let final_score = score.min(100);
    Ok((true, final_score))
}

#[tauri::command]
fn get_levels(state: State<'_, ApplicationState>) -> Result<(Vec<bool>, Vec<usize>, Vec<usize>), String> {
    if state.name.lock().unwrap().is_empty() {
        return Ok((vec![false, false, false], vec![0, 0, 0], vec![0, 0, 0]));
    }
    let level1_completed = *state.level1_completed.lock().unwrap();
    let level2_completed = *state.level2_completed.lock().unwrap();
    let level3_completed = *state.level3_completed.lock().unwrap();
    let level1_time_completed = *state.level1_time_completed.lock().unwrap();
    let level2_time_completed = *state.level2_time_completed.lock().unwrap();
    let level3_time_completed = *state.level3_time_completed.lock().unwrap();
    let level1_score = *state.level1_score.lock().unwrap();
    let level2_score = *state.level2_score.lock().unwrap();
    let level3_score = *state.level3_score.lock().unwrap();

    Ok((
        vec![level1_completed, level2_completed, level3_completed],
        vec![
            level1_time_completed,
            level2_time_completed,
            level3_time_completed,
        ],
        vec![level1_score, level2_score, level3_score],
    ))
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_process::init())
        .manage(ApplicationState {
            name: Mutex::new(String::new()),
            dirname: Mutex::new(String::new()),
            level1_completed: Mutex::new(false),
            level2_completed: Mutex::new(false),
            level3_completed: Mutex::new(false),
            level1_time_completed: Mutex::new(0),
            level2_time_completed: Mutex::new(0),
            level3_time_completed: Mutex::new(0),
            level1_score: Mutex::new(0),
            level2_score: Mutex::new(0),
            level3_score: Mutex::new(0),
        })
        .invoke_handler(tauri::generate_handler![
            store_smtp_credentials,
            has_smtp_credentials,
            setup_user,
            send_mail,
            create_certificate,
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
