#!/usr/bin/env bash
# Starts the backend (FastAPI, port 8000) and frontend (Vite, port 5273)
# together. First run creates the venv and installs deps. Ctrl+C stops both.
#   Usage:  ./run.sh          (macOS / Linux; on Windows use ./run.ps1)
set -e
root="$(cd "$(dirname "$0")" && pwd)"
env_file="$root/backend/.env"

# --- Ensure an Anthropic API key exists, or fall back to offline demo mode ---
have_key=""
[ -n "$ANTHROPIC_API_KEY" ] && have_key=1
if [ -z "$have_key" ] && [ -f "$env_file" ]; then
  val="$(grep -E '^[[:space:]]*ANTHROPIC_API_KEY[[:space:]]*=' "$env_file" | head -1 | sed -E 's/^[^=]*=[[:space:]]*//')"
  [ -n "$val" ] && have_key=1
fi
if [ -z "$have_key" ]; then
  echo ""
  echo "No Anthropic API key found."
  echo "Paste your Anthropic API key to enable Real AI mode (saved to backend/.env),"
  echo "or just press Enter to run in offline demo mode (the pre-generated deck only)."
  printf "ANTHROPIC_API_KEY: "
  read -r key
  key="$(printf '%s' "$key" | tr -d '[:space:]')"
  if [ -n "$key" ]; then
    if [ -f "$env_file" ] && grep -qE '^[[:space:]]*ANTHROPIC_API_KEY[[:space:]]*=' "$env_file"; then
      tmp="$(mktemp)"
      sed -E "s|^[[:space:]]*ANTHROPIC_API_KEY[[:space:]]*=.*|ANTHROPIC_API_KEY=$key|" "$env_file" > "$tmp" && mv "$tmp" "$env_file"
    else
      echo "ANTHROPIC_API_KEY=$key" >> "$env_file"
    fi
    echo "Saved to backend/.env - Real AI mode enabled."
  else
    echo "No key entered - running in OFFLINE DEMO MODE. Add one to backend/.env anytime."
  fi
  echo ""
fi

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
(cd "$root/backend" && .venv/bin/python -m uvicorn app.main:app --reload --port 8123) &
backend_pid=$!
echo "Backend  -> http://localhost:8123  (PID $backend_pid)"

# Stop the backend whenever this script exits (Ctrl+C included).
trap 'echo; echo "Stopping backend..."; kill "$backend_pid" 2>/dev/null' EXIT

# --- Start the frontend in the foreground ---
echo "Frontend -> http://localhost:5273"
(cd "$root/frontend" && npm run dev)
