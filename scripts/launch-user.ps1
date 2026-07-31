# Launches the standalone widget for non-developers.
# Installs release exe to %LOCALAPPDATA%\CursorUsageWidget\ and starts it.

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path (Join-Path $Root "package.json"))) {
  $Root = $PSScriptRoot
}

$InstallDir = Join-Path $env:LOCALAPPDATA "CursorUsageWidget"
$InstallExe = Join-Path $InstallDir "cursor-usage-widget.exe"
$ReleaseExe = Join-Path $Root "src-tauri\target\release\cursor-usage-widget.exe"

function Show-Error([string]$Message) {
  Add-Type -AssemblyName PresentationFramework | Out-Null
  [System.Windows.MessageBox]::Show($Message, "Cursor Usage Widget", "OK", "Error") | Out-Null
}

function Ensure-VcEnv {
  $vswhere = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe"
  $vsPath = $null
  if (Test-Path $vswhere) {
    $vsPath = & $vswhere -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath 2>$null
  }
  if (-not $vsPath) {
    $fallback = "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools"
    if (Test-Path $fallback) { $vsPath = $fallback }
  }
  if (-not $vsPath) { return $null }
  $bat = Join-Path $vsPath "VC\Auxiliary\Build\vcvars64.bat"
  if (-not (Test-Path $bat)) { return $null }
  return $bat
}

function Build-Release {
  $vcvars = Ensure-VcEnv
  if (-not $vcvars) {
    Show-Error "Release build needs Visual Studio C++ Build Tools.`n`nRun once in a dev shell:`n  npm run build:app`n`nThen double-click start.bat again."
    exit 1
  }

  Write-Host "Building release (first time may take a few minutes)..."
  $cmd = "`"$vcvars`" && cd /d `"$Root`" && npm run build:app"
  cmd /c $cmd
  if ($LASTEXITCODE -ne 0 -or -not (Test-Path $ReleaseExe)) {
    Show-Error "Build failed. Check Node.js / Rust / VS Build Tools."
    exit 1
  }
}

if (-not (Test-Path $InstallExe)) {
  if (-not (Test-Path $ReleaseExe)) {
    Push-Location $Root
    try {
      if (-not (Test-Path (Join-Path $Root "node_modules"))) {
        Write-Host "npm install..."
        npm install
      }
      Build-Release
    } finally {
      Pop-Location
    }
  }
  New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
  Copy-Item -Force $ReleaseExe $InstallExe
  Write-Host "Installed: $InstallExe"
} elseif (Test-Path $ReleaseExe) {
  $src = Get-Item $ReleaseExe
  $dst = Get-Item $InstallExe
  if ($src.LastWriteTime -gt $dst.LastWriteTime -or $src.Length -ne $dst.Length) {
    Copy-Item -Force $ReleaseExe $InstallExe
    Write-Host "Updated install copy from latest release."
  }
}

try {
  $desktop = [Environment]::GetFolderPath("Desktop")
  $lnkPath = Join-Path $desktop "Cursor Usage Widget.lnk"
  $w = New-Object -ComObject WScript.Shell
  $lnk = $w.CreateShortcut($lnkPath)
  $lnk.TargetPath = $InstallExe
  $lnk.WorkingDirectory = $InstallDir
  $lnk.Description = "Cursor Usage floating widget"
  $lnk.IconLocation = "$InstallExe,0"
  $lnk.Save()
} catch {
  # ignore shortcut failures
}

Start-Process -FilePath $InstallExe
exit 0
