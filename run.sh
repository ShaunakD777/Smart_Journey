#!/usr/bin/env bash
#
# Sets up and runs Smart Journey (databases, backend and frontend) from one terminal.
# This is the macOS / Linux counterpart of run.ps1.
#
# NOTE: This script was tested on Windows (Git Bash) only. It has not yet been
#       tested on macOS or Linux - please report any problems you run into.
#
#   1. Checks for Python 3.11/3.12, Node.js 18+ and Docker.
#   2. Starts PostgreSQL and Weaviate with docker compose.
#   3. Creates backend/.venv and installs Python packages (again only when requirements.txt changes).
#   4. Installs frontend packages (again only when package-lock.json changes).
#   5. Creates backend/.env and frontend/.env from the examples on first run.
#   6. Runs the backend (http://localhost:8000) and frontend (http://localhost:3000) together.
#   Press Ctrl+C to stop both. The databases keep running; stop them with "docker compose down".
#
# Usage: ./run.sh [--setup-only] [--skip-docker] [--no-browser]
#   --setup-only   Install everything and exit without starting the servers
#   --skip-docker  Don't start the databases with Docker (use your own PostgreSQL from DATABASE_URL)
#   --no-browser   Don't open the app in the browser

set -u

SETUP_ONLY=0
SKIP_DOCKER=0
NO_BROWSER=0
for arg in "$@"; do
    case "$arg" in
        --setup-only)  SETUP_ONLY=1 ;;
        --skip-docker) SKIP_DOCKER=1 ;;
        --no-browser)  NO_BROWSER=1 ;;
        -h|--help)     sed -n '2,21p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
        *) echo "Unknown option: $arg (see --help)"; exit 1 ;;
    esac
done

ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$ROOT/backend"
FRONTEND_DIR="$ROOT/frontend"
BACKEND_URL="http://localhost:8000"
FRONTEND_URL="http://localhost:3000"

# Virtual environments use Scripts/ on Windows (Git Bash) and bin/ elsewhere
if [ -d "$BACKEND_DIR/.venv/Scripts" ] || [ "${OS:-}" = "Windows_NT" ]; then
    VENV_PYTHON="$BACKEND_DIR/.venv/Scripts/python.exe"
else
    VENV_PYTHON="$BACKEND_DIR/.venv/bin/python"
fi

if [ -t 1 ]; then
    CYAN=$'\033[36m'; GREEN=$'\033[32m'; YELLOW=$'\033[33m'; RED=$'\033[31m'; MAGENTA=$'\033[35m'; RESET=$'\033[0m'
else
    CYAN=""; GREEN=""; YELLOW=""; RED=""; MAGENTA=""; RESET=""
fi
step() { printf '\n%s==> %s%s\n' "$CYAN" "$1" "$RESET"; }
ok()   { printf '    %s%s%s\n' "$GREEN" "$1" "$RESET"; }
warn() { printf '    %sWARNING: %s%s\n' "$YELLOW" "$1" "$RESET"; }
die()  { printf '\n%sERROR: %s%s\n' "$RED" "$1" "$RESET"; exit 1; }

# SHA-256 of a file, upper-case so the markers match the ones run.ps1 writes
file_hash() {
    if command -v sha256sum >/dev/null 2>&1; then
        sha256sum "$1" | cut -d' ' -f1 | tr 'a-f' 'A-F'
    else
        shasum -a 256 "$1" | cut -d' ' -f1 | tr 'a-f' 'A-F'
    fi
}
read_marker() { [ -f "$1" ] && tr -d '\r\n' < "$1"; }

# Value of KEY in a .env file (empty if missing)
env_value() {
    grep -E "^[[:space:]]*$1[[:space:]]*=" "$2" 2>/dev/null | tail -n 1 | cut -d'=' -f2- \
        | tr -d '\r' | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^["'\'']//' -e 's/["'\'']$//'
}

port_in_use() { (echo > "/dev/tcp/127.0.0.1/$1") >/dev/null 2>&1; }

python_version() { "$@" -c "import sys; print('%d.%d' % sys.version_info[:2])" 2>/dev/null; }

# Finds a Python 3.11 or 3.12 interpreter (some pinned packages have no wheels for newer versions)
PYTHON=""
find_python() {
    for candidate in python3.12 python3.11 "py -3.12" "py -3.11" python3 python; do
        set -- $candidate
        command -v "$1" >/dev/null 2>&1 || continue
        case "$(python_version "$@")" in
            3.11|3.12) PYTHON="$candidate"; return 0 ;;
        esac
    done
    return 1
}

cd "$ROOT" || exit 1
printf '%sSmart Journey - setup and run%s\n' "$MAGENTA" "$RESET"

# --- 1. Prerequisites ---
step "Checking prerequisites"

find_python || die "Python 3.11 or 3.12 is required. Install it from https://www.python.org/downloads/ and re-run."
ok "Python $(python_version $PYTHON)"

command -v node >/dev/null 2>&1 || die "Node.js 18+ is required. Install it from https://nodejs.org/ and re-run."
NODE_MAJOR="$(node -v | sed 's/^v//' | cut -d. -f1)"
[ "$NODE_MAJOR" -ge 18 ] || die "Node.js 18+ is required (found $(node -v))."
ok "Node.js $(node -v)"

USE_DOCKER=1
[ "$SKIP_DOCKER" -eq 1 ] && USE_DOCKER=0
COMPOSE=""
if [ "$USE_DOCKER" -eq 1 ]; then
    if ! command -v docker >/dev/null 2>&1; then
        warn "Docker not found - skipping the databases. PostgreSQL must already be running at DATABASE_URL."
        USE_DOCKER=0
    elif ! docker info >/dev/null 2>&1; then
        warn "Docker is installed but not running (or needs sudo) - PostgreSQL must already be running at DATABASE_URL."
        USE_DOCKER=0
    else
        if docker compose version >/dev/null 2>&1; then COMPOSE="docker compose"
        elif command -v docker-compose >/dev/null 2>&1; then COMPOSE="docker-compose"
        else die "Docker Compose is not available. Install the Docker Compose plugin and re-run."
        fi
        ok "Docker is running"
    fi
fi

# --- 2. Environment files ---
step "Checking configuration"

BACKEND_ENV="$BACKEND_DIR/.env"
if [ ! -f "$BACKEND_ENV" ]; then
    SECRET="$($PYTHON -c "import secrets; print(secrets.token_urlsafe(48))")"
    # Copy the example and fill in a stable random key for signing login tokens
    awk -v secret="$SECRET" '{ sub(/\r$/, "") } /^SECRET_KEY=[[:space:]]*$/ { print "SECRET_KEY=" secret; next } { print }' \
        "$BACKEND_DIR/.env.example" > "$BACKEND_ENV"
    ok "Created backend/.env from backend/.env.example"
fi

if [ ! -f "$FRONTEND_DIR/.env" ]; then
    cp "$FRONTEND_DIR/.env.example" "$FRONTEND_DIR/.env"
    ok "Created frontend/.env from frontend/.env.example"
fi

LLM_KEYS=""
for key in GEMINI_API_KEY GROQ_API_KEY OPENROUTER_API_KEY; do
    [ -n "$(env_value "$key" "$BACKEND_ENV")" ] && LLM_KEYS="${LLM_KEYS:+$LLM_KEYS, }$key"
done
[ -n "$LLM_KEYS" ] || die "No LLM API key is set. Open backend/.env, add at least GEMINI_API_KEY (or GROQ_API_KEY / OPENROUTER_API_KEY) and SERPAPI_KEY, then run this script again."
ok "LLM key(s) set: $LLM_KEYS"
[ -n "$(env_value SERPAPI_KEY "$BACKEND_ENV")" ] || \
    warn "SERPAPI_KEY is empty - flight, hotel and restaurant searches will fall back to the model's general knowledge."
if [ -n "$(env_value WEAVIATE_API_KEY "$BACKEND_ENV")" ] && \
   env_value WEAVIATE_URL "$BACKEND_ENV" | grep -Eq 'localhost|127\.0\.0\.1'; then
    warn "WEAVIATE_API_KEY is set, but the local Docker Weaviate rejects API keys. Leave it empty to enable trip memory."
fi

# --- 3. Databases ---
if [ "$USE_DOCKER" -eq 1 ]; then
    step "Starting PostgreSQL and Weaviate (docker compose)"
    $COMPOSE up -d || die "docker compose up failed."

    HEALTH=""
    for _ in $(seq 1 45); do
        HEALTH="$(docker inspect -f '{{.State.Health.Status}}' tripplanner_postgres 2>/dev/null)"
        [ "$HEALTH" = "healthy" ] && break
        sleep 2
    done
    [ "$HEALTH" = "healthy" ] || die "PostgreSQL did not become healthy. Check: $COMPOSE logs postgres"
    ok "PostgreSQL is ready"
fi

# --- 4. Backend dependencies ---
step "Setting up the backend"

if [ ! -x "$VENV_PYTHON" ]; then
    ok "Creating virtual environment in backend/.venv"
    $PYTHON -m venv "$BACKEND_DIR/.venv" || die "Creating the virtual environment failed."
fi

VENV_VERSION="$(python_version "$VENV_PYTHON")"
case "$VENV_VERSION" in
    3.11|3.12) ;;
    *) die "backend/.venv uses Python $VENV_VERSION, but 3.11 or 3.12 is required. Delete backend/.venv and re-run." ;;
esac

REQ_MARKER="$BACKEND_DIR/.venv/.requirements-hash"
REQ_HASH="$(file_hash "$BACKEND_DIR/requirements.txt")"
if [ "$(read_marker "$REQ_MARKER")" != "$REQ_HASH" ]; then
    ok "Installing Python packages (this can take a few minutes the first time)"
    "$VENV_PYTHON" -m pip install --disable-pip-version-check -q -r "$BACKEND_DIR/requirements.txt" \
        || die "pip install failed."
    echo "$REQ_HASH" > "$REQ_MARKER"
fi
ok "Python packages are up to date"

# --- 5. Frontend dependencies ---
step "Setting up the frontend"

NPM_MARKER="$FRONTEND_DIR/node_modules/.install-hash"
LOCK_HASH="$(file_hash "$FRONTEND_DIR/package-lock.json")"
if [ "$(read_marker "$NPM_MARKER")" != "$LOCK_HASH" ]; then
    ok "Installing npm packages"
    (cd "$FRONTEND_DIR" && npm install --no-fund --no-audit) || die "npm install failed."
    echo "$LOCK_HASH" > "$NPM_MARKER"
fi
ok "npm packages are up to date"

if [ "$SETUP_ONLY" -eq 1 ]; then
    printf '\n%sSetup complete. Run ./run.sh to start the app.%s\n' "$GREEN" "$RESET"
    exit 0
fi

# --- 6. Run ---
for port in 8000 3000; do
    port_in_use "$port" && die "Port $port is already in use. Stop whatever is running on it and re-run."
done

step "Starting the backend and frontend (press Ctrl+C to stop)"

BACKEND_PID=""
FRONTEND_PID=""

# Stops a process and everything it started
kill_tree() {
    local pid="$1"
    [ -n "$pid" ] || return 0
    kill -0 "$pid" 2>/dev/null || return 0
    if [ -r "/proc/$pid/winpid" ] && command -v taskkill >/dev/null 2>&1; then
        # Git Bash on Windows: the servers are native Windows processes
        taskkill //PID "$(cat "/proc/$pid/winpid")" //T //F >/dev/null 2>&1
    else
        pkill -TERM -P "$pid" 2>/dev/null
        kill -TERM "$pid" 2>/dev/null
    fi
}

STOPPED=0
cleanup() {
    [ "$STOPPED" -eq 1 ] && return
    STOPPED=1
    kill_tree "$BACKEND_PID"
    kill_tree "$FRONTEND_PID"
    printf '\n%sServers stopped. The databases are still running - stop them with: docker compose down%s\n' "$CYAN" "$RESET"
}
trap 'cleanup; exit 130' INT TERM
trap cleanup EXIT

(cd "$BACKEND_DIR" && exec "$VENV_PYTHON" -m uvicorn main:app --reload --port 8000) &
BACKEND_PID=$!
(cd "$FRONTEND_DIR" && exec node node_modules/vite/bin/vite.js --port 3000 --strictPort) &
FRONTEND_PID=$!

both_running() { kill -0 "$BACKEND_PID" 2>/dev/null && kill -0 "$FRONTEND_PID" 2>/dev/null; }

# Wait for the backend to answer before opening the browser
READY=0
for _ in $(seq 1 120); do
    both_running || { printf '\n%sERROR: A server exited during startup - see the output above.%s\n' "$RED" "$RESET"; exit 1; }
    if curl -s -o /dev/null --max-time 2 "http://127.0.0.1:8000/api/health"; then READY=1; break; fi
    sleep 1
done
[ "$READY" -eq 1 ] || { printf '\n%sERROR: The backend did not start within 2 minutes - see the output above.%s\n' "$RED" "$RESET"; exit 1; }

printf '\n%s  Smart Journey is running:\n    App:      %s\n    API docs: %s/docs\n  Press Ctrl+C to stop.%s\n\n' \
    "$GREEN" "$FRONTEND_URL" "$BACKEND_URL" "$RESET"

if [ "$NO_BROWSER" -eq 0 ]; then
    if command -v open >/dev/null 2>&1 && [ "$(uname -s)" = "Darwin" ]; then open "$FRONTEND_URL"
    elif command -v xdg-open >/dev/null 2>&1; then xdg-open "$FRONTEND_URL" >/dev/null 2>&1
    elif command -v cmd.exe >/dev/null 2>&1; then cmd.exe //c start "" "$FRONTEND_URL"
    fi
fi

while both_running; do sleep 1; done
printf '\n%sERROR: A server stopped unexpectedly - see the output above.%s\n' "$RED" "$RESET"
exit 1
