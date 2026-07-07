@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js not found. Install it from https://nodejs.org first.
  pause
  exit /b 1
)

echo [1/3] Auto-start at login...
powershell -NoProfile -Command ^
  "$ws = New-Object -ComObject WScript.Shell;" ^
  "$s = $ws.CreateShortcut([Environment]::GetFolderPath('Startup') + '\ChiefOfStaff-Server.lnk');" ^
  "$s.TargetPath = 'wscript.exe';" ^
  "$s.Arguments = '\"%~dp0start-hidden.vbs\"';" ^
  "$s.WorkingDirectory = '%~dp0';" ^
  "$s.Description = 'Chief of Staff board server';" ^
  "$s.Save()"

echo [2/3] Desktop app shortcut...
powershell -NoProfile -Command ^
  "$browser = $null;" ^
  "foreach ($k in 'chrome.exe','msedge.exe') {" ^
  "  $p = (Get-ItemProperty ('HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\' + $k) -ErrorAction SilentlyContinue).'(default)';" ^
  "  if ($p) { $browser = $p; break }" ^
  "};" ^
  "$ws = New-Object -ComObject WScript.Shell;" ^
  "$s = $ws.CreateShortcut([Environment]::GetFolderPath('Desktop') + '\Chief of Staff.lnk');" ^
  "if ($browser) { $s.TargetPath = $browser; $s.Arguments = '--app=http://localhost:4820 --user-data-dir=\"' + $env:LOCALAPPDATA + '\ChiefOfStaffApp\"' }" ^
  "else { $s.TargetPath = 'http://localhost:4820' };" ^
  "$s.Description = 'Chief of Staff board';" ^
  "if (Test-Path '%~dp0icon.ico') { $s.IconLocation = '%~dp0icon.ico,0' };" ^
  "$s.Save()"

echo [3/3] Starting server now...
wscript "%~dp0start-hidden.vbs"

echo.
echo Done. "Chief of Staff" is on your desktop. Server auto-starts at login.
echo Board: http://localhost:4820
pause
