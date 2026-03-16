mod ollama;

use ollama::{ChatMessage, OllamaClient};
use serde::{Deserialize, Serialize};
use tauri::{
    AppHandle, Emitter, Manager,
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
};
use tokio::sync::Mutex;

struct AppState {
    ollama: OllamaClient,
    settings: AppSettings,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChatRequest {
    pub model: String,
    pub messages: Vec<ChatMessage>,
}

#[derive(Debug, Serialize, Clone)]
pub struct ChatTokenEvent {
    pub content: String,
    pub done: bool,
}

#[derive(Debug, Serialize, Clone)]
pub struct ModelInfo {
    pub name: String,
    pub size: u64,
    pub modified_at: String,
}

#[derive(Debug, Serialize, Clone)]
pub struct LibraryModel {
    pub name: String,
    pub description: String,
    pub pulls: String,
    pub tag_count: String,
    pub url: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppSettings {
    pub ollama_url: String,
    pub context_size: u64,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            ollama_url: "http://localhost:11434".to_string(),
            context_size: 2048,
        }
    }
}

#[derive(Debug, Serialize, Clone)]
pub struct PullProgressEvent {
    pub status: String,
    pub total: u64,
    pub completed: u64,
    pub done: bool,
}

fn settings_path() -> std::path::PathBuf {
    let config_dir = dirs::config_dir().unwrap_or_else(|| std::path::PathBuf::from("."));
    let app_dir = config_dir.join("orooster");
    std::fs::create_dir_all(&app_dir).ok();
    app_dir.join("settings.json")
}

fn load_settings_from_disk() -> AppSettings {
    let path = settings_path();
    if path.exists() {
        if let Ok(data) = std::fs::read_to_string(&path) {
            if let Ok(settings) = serde_json::from_str::<AppSettings>(&data) {
                return settings;
            }
        }
    }
    AppSettings::default()
}

fn save_settings_to_disk(settings: &AppSettings) -> Result<(), String> {
    let path = settings_path();
    let data = serde_json::to_string_pretty(settings).map_err(|e| e.to_string())?;
    std::fs::write(&path, data).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn fetch_library(
    state: tauri::State<'_, Mutex<AppState>>,
) -> Result<Vec<LibraryModel>, String> {
    let state = state.lock().await;
    state.ollama.fetch_library_models().await
}

#[tauri::command]
async fn list_running(
    state: tauri::State<'_, Mutex<AppState>>,
) -> Result<Vec<String>, String> {
    let state = state.lock().await;
    state.ollama.list_running_models().await
}

#[tauri::command]
async fn load_model(
    state: tauri::State<'_, Mutex<AppState>>,
    name: String,
) -> Result<(), String> {
    // Get the base_url and drop the lock before the long HTTP call
    let base_url = {
        let s = state.lock().await;
        s.settings.ollama_url.clone()
    };
    let client = OllamaClient::new(&base_url);
    client.load_model(&name).await
}

#[tauri::command]
async fn unload_model(
    state: tauri::State<'_, Mutex<AppState>>,
    name: String,
) -> Result<(), String> {
    let base_url = {
        let s = state.lock().await;
        s.settings.ollama_url.clone()
    };
    let client = OllamaClient::new(&base_url);
    client.unload_model(&name).await
}

#[tauri::command]
async fn list_models(state: tauri::State<'_, Mutex<AppState>>) -> Result<Vec<ModelInfo>, String> {
    let state = state.lock().await;
    state
        .ollama
        .list_models()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn pull_model(
    app: AppHandle,
    state: tauri::State<'_, Mutex<AppState>>,
    name: String,
) -> Result<(), String> {
    let state_guard = state.lock().await;
    let mut stream = state_guard
        .ollama
        .pull_model_stream(&name)
        .await
        .map_err(|e| e.to_string())?;

    drop(state_guard);

    use futures::StreamExt;
    while let Some(chunk) = stream.next().await {
        match chunk {
            Ok(progress) => {
                let done = progress.status == "success";
                let event = PullProgressEvent {
                    status: progress.status,
                    total: progress.total,
                    completed: progress.completed,
                    done,
                };
                app.emit("pull-progress", &event).map_err(|e| e.to_string())?;
                if done {
                    break;
                }
            }
            Err(e) => {
                app.emit("pull-error", e.to_string())
                    .map_err(|e| e.to_string())?;
                break;
            }
        }
    }
    Ok(())
}

#[tauri::command]
async fn delete_model(
    state: tauri::State<'_, Mutex<AppState>>,
    name: String,
) -> Result<(), String> {
    let state = state.lock().await;
    state.ollama.delete_model(&name).await
}

#[tauri::command]
async fn chat_stream(
    app: AppHandle,
    state: tauri::State<'_, Mutex<AppState>>,
    request: ChatRequest,
) -> Result<(), String> {
    let state_guard = state.lock().await;
    let context_size = state_guard.settings.context_size;
    let mut stream = state_guard
        .ollama
        .chat_stream(&request.model, &request.messages, Some(context_size))
        .await
        .map_err(|e| e.to_string())?;

    drop(state_guard);

    use futures::StreamExt;
    while let Some(chunk) = stream.next().await {
        match chunk {
            Ok(response) => {
                let event = ChatTokenEvent {
                    content: response.message.content.clone(),
                    done: response.done,
                };
                app.emit("chat-token", &event).map_err(|e| e.to_string())?;
                if response.done {
                    break;
                }
            }
            Err(e) => {
                app.emit("chat-error", e.to_string())
                    .map_err(|e| e.to_string())?;
                break;
            }
        }
    }
    Ok(())
}

#[tauri::command]
async fn check_connection(
    state: tauri::State<'_, Mutex<AppState>>,
) -> Result<bool, String> {
    let state = state.lock().await;
    Ok(state.ollama.is_running().await)
}

#[tauri::command]
async fn get_settings(
    state: tauri::State<'_, Mutex<AppState>>,
) -> Result<AppSettings, String> {
    let state = state.lock().await;
    Ok(state.settings.clone())
}

#[tauri::command]
async fn save_settings(
    state: tauri::State<'_, Mutex<AppState>>,
    settings: AppSettings,
) -> Result<(), String> {
    let mut state = state.lock().await;
    state.ollama.set_base_url(&settings.ollama_url);
    state.settings = settings.clone();
    save_settings_to_disk(&settings)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let settings = load_settings_from_disk();
    let ollama_url = settings.ollama_url.clone();

    tauri::Builder::default()
        .manage(Mutex::new(AppState {
            ollama: OllamaClient::new(&ollama_url),
            settings,
        }))
        .invoke_handler(tauri::generate_handler![
            list_models,
            chat_stream,
            check_connection,
            pull_model,
            delete_model,
            get_settings,
            save_settings,
            fetch_library,
            list_running,
            load_model,
            unload_model,
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // System tray
            let show_item = MenuItem::with_id(app, "show", "Show ORooster", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let tray_menu = Menu::with_items(app, &[&show_item, &quit_item])?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().cloned().unwrap())
                .tooltip("ORooster")
                .menu(&tray_menu)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let tauri::tray::TrayIconEvent::Click { .. } = event {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            // Splash → main transition
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                tokio::time::sleep(std::time::Duration::from_secs(5)).await;
                if let Some(splash) = handle.get_webview_window("splash") {
                    let _ = splash.close();
                }
                if let Some(main) = handle.get_webview_window("main") {
                    let _ = main.show();
                    let _ = main.set_focus();
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
