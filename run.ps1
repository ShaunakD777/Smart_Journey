<#
.SYNOPSIS
    Sets up and runs Smart Journey (databases, backend and frontend) from one terminal.

.DESCRIPTION
    1. Checks for Python 3.11/3.12, Node.js 18+ and Docker.
    2. Starts PostgreSQL and Weaviate with docker compose.
    3. Creates backend/.venv and installs Python packages (again only when requirements.txt changes).
    4. Installs frontend packages (again only when package-lock.json changes).
    5. Creates backend/.env and frontend/.env from the examples on first run.
    6. Runs the backend (http://localhost:8000) and frontend (http://localhost:3000) together.
    Press Ctrl+C to stop both. The databases keep running; stop them with "docker compose down".

.PARAMETER SetupOnly
    Install everything and exit without starting the servers.

.PARAMETER SkipDocker
    Don't start the databases with Docker (use your own PostgreSQL from DATABASE_URL).

.PARAMETER NoBrowser
    Don't open the app in the browser.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\run.ps1
#>
param(
    [switch]$SetupOnly,
    [switch]$SkipDocker,
    [switch]$NoBrowser
)

$Root        = $PSScriptRoot
$BackendDir  = Join-Path $Root "backend"
$FrontendDir = Join-Path $Root "frontend"
$VenvPython  = Join-Path $BackendDir ".venv\Scripts\python.exe"
$BackendUrl  = "http://localhost:8000"
$FrontendUrl = "http://localhost:3000"

function Write-Step($Message) { Write-Host "`n==> $Message" -ForegroundColor Cyan }
function Write-Ok($Message)   { Write-Host "    $Message" -ForegroundColor Green }
function Write-Warn($Message) { Write-Host "    WARNING: $Message" -ForegroundColor Yellow }
function Stop-WithError($Message) {
    Write-Host "`nERROR: $Message" -ForegroundColor Red
    exit 1
}

# Runs a native command and stops the script if it fails.
function Invoke-Native([string]$Description, [scriptblock]$Command) {
    & $Command
    if ($LASTEXITCODE -ne 0) { Stop-WithError "$Description failed (exit code $LASTEXITCODE)." }
}

function Get-FileHashString($Path) { (Get-FileHash -Algorithm SHA256 -Path $Path).Hash }

# Reads KEY=VALUE pairs from a .env file (comments and blank lines ignored).
function Read-DotEnv($Path) {
    $values = @{}
    foreach ($line in Get-Content -Path $Path) {
        if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$') {
            $values[$Matches[1]] = $Matches[2].Trim('"').Trim("'")
        }
    }
    return $values
}

function Test-PortInUse([int]$Port) {
    return [bool](Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
}

# Finds a Python 3.11 or 3.12 interpreter (some pinned packages have no wheels for newer versions).
function Find-Python {
    $candidates = @(
        @("py", "-3.12"), @("py", "-3.11"), @("python"), @("python3")
    )
    foreach ($candidate in $candidates) {
        $exe = $candidate[0]
        if (-not (Get-Command $exe -ErrorAction SilentlyContinue)) { continue }
        $pyArgs = @($candidate | Select-Object -Skip 1)
        $version = & $exe @pyArgs -c "import sys; print('%d.%d' % sys.version_info[:2])" 2>$null
        if ($LASTEXITCODE -eq 0 -and $version -in @("3.11", "3.12")) {
            return @{ Exe = $exe; Args = $pyArgs; Version = $version }
        }
    }
    return $null
}

Set-Location $Root
Write-Host "Smart Journey - setup and run" -ForegroundColor Magenta

# --- 1. Prerequisites ---
Write-Step "Checking prerequisites"

$python = Find-Python
if (-not $python) {
    Stop-WithError "Python 3.11 or 3.12 is required. Install it from https://www.python.org/downloads/ and re-run."
}
Write-Ok "Python $($python.Version)"

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Stop-WithError "Node.js 18+ is required. Install it from https://nodejs.org/ and re-run."
}
$nodeMajor = [int]((node -v).TrimStart("v").Split(".")[0])
if ($nodeMajor -lt 18) { Stop-WithError "Node.js 18+ is required (found $(node -v))." }
Write-Ok "Node.js $(node -v)"

$useDocker = -not $SkipDocker
if ($useDocker) {
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        Write-Warn "Docker not found - skipping the databases. PostgreSQL must already be running at DATABASE_URL."
        $useDocker = $false
    } else {
        docker info *> $null
        if ($LASTEXITCODE -ne 0) {
            Write-Warn "Docker is installed but not running - start Docker Desktop, or PostgreSQL must already be running at DATABASE_URL."
            $useDocker = $false
        } else {
            Write-Ok "Docker is running"
        }
    }
}

# --- 2. Environment files ---
Write-Step "Checking configuration"

$backendEnv = Join-Path $BackendDir ".env"
if (-not (Test-Path $backendEnv)) {
    Copy-Item (Join-Path $BackendDir ".env.example") $backendEnv
    # Generate a stable random key for signing login tokens
    $bytes = New-Object byte[] 48
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    $secret = [Convert]::ToBase64String($bytes).TrimEnd("=").Replace("+", "-").Replace("/", "_")
    (Get-Content $backendEnv) -replace '^SECRET_KEY=\s*$', "SECRET_KEY=$secret" | Set-Content -Encoding UTF8 $backendEnv
    Write-Ok "Created backend\.env from backend\.env.example"
}

$frontendEnv = Join-Path $FrontendDir ".env"
if (-not (Test-Path $frontendEnv)) {
    Copy-Item (Join-Path $FrontendDir ".env.example") $frontendEnv
    Write-Ok "Created frontend\.env from frontend\.env.example"
}

$envValues = Read-DotEnv $backendEnv
$llmKeys = @("GEMINI_API_KEY", "GROQ_API_KEY", "OPENROUTER_API_KEY") | Where-Object { $envValues[$_] }
if (-not $llmKeys) {
    Stop-WithError ("No LLM API key is set. Open backend\.env, add at least GEMINI_API_KEY " +
                    "(or GROQ_API_KEY / OPENROUTER_API_KEY) and SERPAPI_KEY, then run this script again.")
}
Write-Ok "LLM key(s) set: $($llmKeys -join ', ')"
if (-not $envValues["SERPAPI_KEY"]) {
    Write-Warn "SERPAPI_KEY is empty - flight, hotel and restaurant searches will fall back to the model's general knowledge."
}
if ($envValues["WEAVIATE_API_KEY"] -and ($envValues["WEAVIATE_URL"] -match "localhost|127\.0\.0\.1")) {
    Write-Warn "WEAVIATE_API_KEY is set, but the local Docker Weaviate rejects API keys. Leave it empty to enable trip memory."
}

# --- 3. Databases ---
if ($useDocker) {
    Write-Step "Starting PostgreSQL and Weaviate (docker compose)"
    Invoke-Native "docker compose up" { docker compose up -d }

    $deadline = (Get-Date).AddSeconds(90)
    do {
        $health = docker inspect -f "{{.State.Health.Status}}" tripplanner_postgres 2>$null
        if ($health -eq "healthy") { break }
        Start-Sleep -Seconds 2
    } while ((Get-Date) -lt $deadline)
    if ($health -ne "healthy") { Stop-WithError "PostgreSQL did not become healthy. Check: docker compose logs postgres" }
    Write-Ok "PostgreSQL is ready"
}

# --- 4. Backend dependencies ---
Write-Step "Setting up the backend"

if (-not (Test-Path $VenvPython)) {
    Write-Ok "Creating virtual environment in backend\.venv"
    $pyExe = $python.Exe
    $pyArgs = $python.Args
    Invoke-Native "Creating the virtual environment" { & $pyExe @pyArgs -m venv (Join-Path $BackendDir ".venv") }
}

$venvVersion = & $VenvPython -c "import sys; print('%d.%d' % sys.version_info[:2])"
if ($venvVersion -notin @("3.11", "3.12")) {
    Stop-WithError "backend\.venv uses Python $venvVersion, but 3.11 or 3.12 is required. Delete backend\.venv and re-run."
}

$requirements = Join-Path $BackendDir "requirements.txt"
$reqMarker = Join-Path $BackendDir ".venv\.requirements-hash"
$reqHash = Get-FileHashString $requirements
if (-not (Test-Path $reqMarker) -or (Get-Content $reqMarker) -ne $reqHash) {
    Write-Ok "Installing Python packages (this can take a few minutes the first time)"
    Invoke-Native "pip install" { & $VenvPython -m pip install --disable-pip-version-check -q -r $requirements }
    Set-Content -Path $reqMarker -Value $reqHash
}
Write-Ok "Python packages are up to date"

# --- 5. Frontend dependencies ---
Write-Step "Setting up the frontend"

$lockFile = Join-Path $FrontendDir "package-lock.json"
$npmMarker = Join-Path $FrontendDir "node_modules\.install-hash"
$lockHash = Get-FileHashString $lockFile
if (-not (Test-Path $npmMarker) -or (Get-Content $npmMarker) -ne $lockHash) {
    Write-Ok "Installing npm packages"
    Push-Location $FrontendDir
    try { Invoke-Native "npm install" { npm install --no-fund --no-audit } } finally { Pop-Location }
    Set-Content -Path $npmMarker -Value $lockHash
}
Write-Ok "npm packages are up to date"

if ($SetupOnly) {
    Write-Host "`nSetup complete. Run .\run.ps1 to start the app." -ForegroundColor Green
    exit 0
}

# --- 6. Run ---
foreach ($port in 8000, 3000) {
    if (Test-PortInUse $port) { Stop-WithError "Port $port is already in use. Stop whatever is running on it and re-run." }
}

Write-Step "Starting the backend and frontend (press Ctrl+C to stop)"

$nodeExe = (Get-Command node).Source
$viteCli = Join-Path $FrontendDir "node_modules\vite\bin\vite.js"
$processes = @()
$exitCode = 0

try {
    $processes += Start-Process -FilePath $VenvPython -WorkingDirectory $BackendDir -NoNewWindow -PassThru `
        -ArgumentList "-m", "uvicorn", "main:app", "--reload", "--port", "8000"
    $processes += Start-Process -FilePath $nodeExe -WorkingDirectory $FrontendDir -NoNewWindow -PassThru `
        -ArgumentList "`"$viteCli`"", "--port", "3000", "--strictPort"

    # Wait for the backend to answer before opening the browser
    $deadline = (Get-Date).AddSeconds(120)
    $ready = $false
    while (-not $ready -and (Get-Date) -lt $deadline) {
        if ($processes | Where-Object { $_.HasExited }) { throw "A server exited during startup - see the output above." }
        try {
            # 127.0.0.1, not localhost: uvicorn listens on IPv4 only and PowerShell tries IPv6 first
            Invoke-WebRequest -Uri "http://127.0.0.1:8000/api/health" -UseBasicParsing -TimeoutSec 2 | Out-Null
            $ready = $true
        } catch {
            Start-Sleep -Seconds 1
        }
    }
    if (-not $ready) { throw "The backend did not start within 2 minutes - see the output above." }

    Write-Host "`n  Smart Journey is running:" -ForegroundColor Green
    Write-Host "    App:      $FrontendUrl" -ForegroundColor Green
    Write-Host "    API docs: $BackendUrl/docs" -ForegroundColor Green
    Write-Host "  Press Ctrl+C to stop.`n" -ForegroundColor Green
    if (-not $NoBrowser) { Start-Process $FrontendUrl }

    while (-not ($processes | Where-Object { $_.HasExited })) { Start-Sleep -Seconds 1 }
    throw "A server stopped unexpectedly - see the output above."
}
catch {
    Write-Host "`nERROR: $($_.Exception.Message)" -ForegroundColor Red
    $exitCode = 1
}
finally {
    # Runs on Ctrl+C too: stop both servers and their child processes
    foreach ($process in $processes) {
        if ($process -and -not $process.HasExited) {
            taskkill /PID $process.Id /T /F *> $null
        }
    }
    Write-Host "`nServers stopped. The databases are still running - stop them with: docker compose down" -ForegroundColor Cyan
}
exit $exitCode
