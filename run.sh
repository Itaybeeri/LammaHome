#!/usr/bin/env bash
# Starts the backend (FastAPI, port 8000) and frontend (Vite, port 5273)
# together. First run creates the venv and installs deps. Ctrl+C stops both.
#   Usage:  ./run.sh          (macOS / Linux; on Windows use ./run.ps1)
set -e
root="$(cd "$(dirname "$0")" && pwd)"

# --- Backend setup (first run only) ---
if [ ! -d "$root/backend/.venv" ]; then
  echo "Setting up backend (venv + deps)..."
  python3 -m venv "$root/backend/.venv"
  "$root/backend/.venv/bin/pip" install -q -r "$root/backend/requirements.txt"
fi

# --- Frontend setup (first run only) ---
if [ ! -d "$root/frontend/node_modules" ]; then
  echo "Setting up frontend (npm install)..."
  (cd "$root/frontend" && npm install)
fi

# --- Start the backend in the background ---
(cd "$root/backend" && .venv/bin/python -m uvicorn app.main:app --reload --port 8000) &
backend_pid=$!
echo "Backend  -> http://localhost:8000  (PID $backend_pid)"

# Stop the backend whenever this script exits (Ctrl+C included).
trap 'echo; echo "Stopping backend..."; kill "$backend_pid" 2>/dev/null' EXIT

# --- Start the frontend in the foreground ---
echo "Frontend -> http://localhost:5273"
(cd "$root/frontend" && npm run dev)
