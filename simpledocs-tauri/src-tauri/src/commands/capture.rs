use tauri::command;
use std::thread;
use std::time::Duration;
use std::process::Command;

#[command]
pub async fn get_selected_text() -> Result<String, String> {
    thread::sleep(Duration::from_millis(100));

    let output = Command::new("powershell")
        .args(["-Command", r#"
            Add-Type -AssemblyName System.Windows.Forms
            $prev = [System.Windows.Forms.Clipboard]::GetText()
            [System.Windows.Forms.Clipboard]::SetText('')
            Start-Sleep -Milliseconds 50
            [System.Windows.Forms.SendKeys]::SendWait('^c')
            Start-Sleep -Milliseconds 150
            $sel = [System.Windows.Forms.Clipboard]::GetText()
            if ($prev) { [System.Windows.Forms.Clipboard]::SetText($prev) }
            Write-Output $sel
        "#])
        .output()
        .map_err(|e| e.to_string())?;

    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}
