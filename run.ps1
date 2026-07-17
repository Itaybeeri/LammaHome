# Starts the backend (FastAPI, port 8000) and frontend (Vite, port 5273)
# together. First run creates the venv, installs deps, and offers to save an
# Anthropic API key. Ctrl+C stops both.
#   Usage:  ./run.ps1
$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$envPath = Join-Path $root "backend/.env"

# --- Read the ANTHROPIC_API_KEY value from backend/.env (empty if none) ---
function Get-EnvKey {
    if (Test-Path $envPath) {
        foreach ($line in Get-Content $envPath) {
            if ($line -match '^\s*ANTHROPIC_API_KEY\s*=\s*(.+?)\s*$') { return $Matches[1] }
        }
    }
    return ""
}

# --- Write/replace the key in backend/.env, preserving other lines ---
function Set-EnvKey($key) {
    $entry = "ANTHROPIC_API_KEY=$key"
    if (Test-Path $envPath) {
        $lines = @(Get-Content $envPath)
        if ($lines -match '^\s*ANTHROPIC_API_KEY\s*=') {
            $lines = $lines | ForEach-Object { if ($_ -match '^\s*ANTHROPIC_API_KEY\s*=') { $entry } else { $_ } }
        } else {
            $lines += $entry
        }
        Set-Content -Path $envPath -Value $lines
    } else {
        Set-Content -Path $envPath -Value $entry
    }
}

# --- Ensure a key exists, or fall back to offline demo mode ---
$haveKey = if ($env:ANTHROPIC_API_KEY) { $env:ANTHROPIC_API_KEY } else { Get-EnvKey }
if (-not $haveKey) {
    Write-Host ""
    Write-Host "No Anthropic API key found." -ForegroundColor Yellow
    Write-Host "Paste your Anthropic API key to enable Real AI mode (it will be saved to backend/.env),"
    Write-Host "or just press Enter to run in offline demo mode (the pre-generated deck only)."
    $key = (Read-Host "ANTHROPIC_API_KEY").Trim()
    if ($key) {
        Set-EnvKey $key
        Write-Host "Saved to backend/.env - Real AI mode enabled." -ForegroundColor Green
    } else {
        Write-Host "No key entered - running in OFFLINE DEMO MODE. Add one to backend/.env anytime." -ForegroundColor Cyan
    }
    Write-Host ""
}

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
