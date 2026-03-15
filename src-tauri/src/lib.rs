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
async fn chat_stream(
    app: AppHandle,
    state: tauri::State<'_, Mutex<AppState>>,
    request: ChatRequest,
) -> Result<(), String> {
    let state = state.lock().await;
    let mut stream = state
        .ollama
        .chat_stream(&request.model, &request.messages)
        .await
        .map_err(|e| e.to_string())?;

    drop(state);

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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(Mutex::new(AppState {
            ollama: OllamaClient::new("http://localhost:11434"),
        }))
        .invoke_handler(tauri::generate_handler![
            list_models,
            chat_stream,
            check_connection
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
