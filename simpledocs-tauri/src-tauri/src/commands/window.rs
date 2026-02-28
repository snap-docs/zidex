use tauri::{command, AppHandle, Manager, LogicalPosition};

#[command]
pub async fn get_screen_size(app: AppHandle) -> Result<(f64, f64), String> {
    let window = app.get_webview_window("main").ok_or("no window")?;
    let monitor = window.current_monitor()
        .map_err(|e| e.to_string())?
        .ok_or("no monitor")?;
    let size = monitor.size();
    let scale = monitor.scale_factor();
    Ok((size.width as f64 / scale, size.height as f64 / scale))
}

#[command]
pub async fn set_window_position(app: AppHandle, x: f64, y: f64) -> Result<(), String> {
    let window = app.get_webview_window("main").ok_or("no window")?;
    window.set_position(LogicalPosition::new(x, y)).map_err(|e| e.to_string())
}

#[command]
pub async fn snap_to_corner(
    app: AppHandle,
    widget_x: f64,
    widget_y: f64,
    widget_size: f64
) -> Result<(f64, f64), String> {
    let window = app.get_webview_window("main").ok_or("no window")?;
    let monitor = window.current_monitor()
        .map_err(|e| e.to_string())?
        .ok_or("no monitor")?;
    let size = monitor.size();
    let scale = monitor.scale_factor();
    let sw = size.width as f64 / scale;
    let sh = size.height as f64 / scale;
    let pad = 16.0;
    let taskbar_height = 52.0; // Windows taskbar height + small buffer
    let cx = widget_x + widget_size / 2.0;
    let cy = widget_y + widget_size / 2.0;

    let corners = [
        (pad,                        pad),                                       // top-left
        (sw - widget_size - pad,     pad),                                       // top-right
        (pad,                        sh - widget_size - taskbar_height),         // bottom-left
        (sw - widget_size - pad,     sh - widget_size - taskbar_height),         // bottom-right
    ];

    let nearest = corners.iter().min_by(|a, b| {
        let da = ((a.0 + widget_size/2.0 - cx).powi(2)
                + (a.1 + widget_size/2.0 - cy).powi(2)).sqrt();
        let db = ((b.0 + widget_size/2.0 - cx).powi(2)
                + (b.1 + widget_size/2.0 - cy).powi(2)).sqrt();
        da.partial_cmp(&db).unwrap()
    }).unwrap();

    window.set_position(LogicalPosition::new(nearest.0, nearest.1))
        .map_err(|e| e.to_string())?;
    Ok(*nearest)
}
