#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;

use tauri::{Manager, Emitter};
use tauri::LogicalSize;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            commands::capture::get_selected_text,
            commands::window::set_window_position,
            commands::window::get_screen_size,
            commands::window::snap_to_corner,
        ])
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();
            window.set_skip_taskbar(true).unwrap();
            window.set_always_on_top(true).unwrap();

            // Start at 52x52 centered
            window.set_size(LogicalSize::new(52.0_f64, 52.0_f64)).unwrap();
            window.center().unwrap();
            window.show().unwrap();
            window.set_focus().unwrap();

            // Emit "window-moved" event whenever the window position changes.
            // The frontend debounces this to trigger corner snap on drag end.
            let window_clone = window.clone();
            window.on_window_event(move |event| {
                if let tauri::WindowEvent::Moved(_) = event {
                    let _ = window_clone.emit("window-moved", ());
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
