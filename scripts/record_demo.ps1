param(
  [Parameter(Mandatory = $true)][string]$AudioDevice,
  [int]$DurationSeconds = 165,
  [string]$Output = ''
)

$ErrorActionPreference = 'Stop'
if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) { throw 'FFmpeg is not installed.' }
if ($DurationSeconds -lt 30 -or $DurationSeconds -gt 179) { throw 'DurationSeconds must be 30–179.' }
$projectRoot = Split-Path -Parent $PSScriptRoot
$recordings = Join-Path $projectRoot 'recordings'
New-Item -ItemType Directory -Path $recordings -Force | Out-Null
if (-not $Output) { $Output = Join-Path $recordings ("chatchorus-" + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.mp4') }
if (Test-Path -LiteralPath $Output) { throw 'Output already exists; choose a new path.' }

Write-Host 'Starting real desktop and selected audio-device capture. Open Twitch and OBS before recording.'
& ffmpeg -hide_banner -f gdigrab -framerate 30 -i desktop -f dshow -i "audio=$AudioDevice" -t $DurationSeconds -c:v libx264 -preset veryfast -pix_fmt yuv420p -c:a aac -b:a 160k -movflags +faststart $Output
if ($LASTEXITCODE -ne 0) { throw "FFmpeg recording failed with exit code $LASTEXITCODE" }
Write-Host "Saved recording: $Output"
