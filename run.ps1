# Starts the backend (FastAPI, port 8000) and frontend (Vite, port 5273)
# together. First run creates the venv and installs deps. Ctrl+C stops both.
#   Usage:  ./run.ps1
$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

# --- Backend setup (first run only) ---
$venvPy = Join-Path $root "backend/.venv/Scripts/python.exe"
if (-not (Test-Path $venvPy)) {
    Write-Host "Setting up backend (venv + deps)..." -ForegroundColor Cyan
    python -m venv (Join-Path $root "backend/.venv")
    & $venvPy -m pip install -q -r (Join-Path $root "backend/requirements.txt")
}

# --- Frontend setup (first run only) ---
if (-not (Test-Path (Join-Path $root "frontend/node_modules"))) {
    Write-Host "Setting up frontend (npm install)..." -ForegroundColor Cyan
    Push-Location (Join-Path $root "frontend"); npm install; Pop-Location
}

# --- Start the backend in the background ---
$backend = Start-Process -FilePath $venvPy `
    -ArgumentList "-m", "uvicorn", "app.main:app", "--reload", "--port", "8000" `
    -WorkingDirectory (Join-Path $root "backend") -PassThru -NoNewWindow
Write-Host "Backend  -> http://localhost:8000  (PID $($backend.Id))" -ForegroundColor Green

try {
    # --- Start the frontend in the foreground ---
    Write-Host "Frontend -> http://localhost:5273" -ForegroundColor Green
    Push-Location (Join-Path $root "frontend")
    npm run dev
}
finally {
    Pop-Location
    Write-Host "`nStopping backend..." -ForegroundColor Cyan
    if (-not $backend.HasExited) { Stop-Process -Id $backend.Id -Force }
}
