#Requires -Version 5.1
# TinVault deploy script for Windows
# Usage: .\deploy.ps1
# If blocked by execution policy, run: powershell -ExecutionPolicy Bypass -File deploy.ps1

$ErrorActionPreference = "Stop"

$BACKEND_IMAGE  = "tcush89/tinvault-backend:latest"
$FRONTEND_IMAGE = "tcush89/tinvault-frontend:latest"
$DEFAULT_PORT   = 3000

function Write-Ok   { param($msg) Write-Host "  v  $msg" -ForegroundColor Green }
function Write-Warn { param($msg) Write-Host "  !  $msg" -ForegroundColor Yellow }
function Write-Info { param($msg) Write-Host "  >  $msg" -ForegroundColor Cyan }
function Write-Hr   { Write-Host "  -----------------------------------------" }
function Write-Fail {
    param($msg)
    Write-Host "`n  X  $msg`n" -ForegroundColor Red
    exit 1
}

function Invoke-Compose {
    if ($script:ComposeIsV2) { & docker compose @args }
    else                     { & docker-compose @args }
}

Write-Host ""
Write-Host "  TinVault -- Self-Hosted Tobacco Cellar" -ForegroundColor White
Write-Hr
Write-Host ""

# ── Dependency checks ────────────────────────────────────────────────────────

Write-Info "Checking dependencies..."
Write-Host ""

# Docker
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Fail "Docker is not installed.`n     Install Docker Desktop from https://docs.docker.com/desktop/install/windows-install/ and re-run this script."
}
$dockerVer = (docker --version) -replace '.*?(\d+\.\d+\.\d+).*', '$1'
Write-Ok "Docker $dockerVer"

# Docker Compose — prefer v2 plugin, fall back to standalone
$null = docker compose version 2>&1
if ($LASTEXITCODE -eq 0) {
    $script:ComposeIsV2 = $true
    $composeVer = (docker compose version) -replace '.*?(\d+\.\d+\.\d+).*', '$1'
    Write-Ok "Docker Compose $composeVer"
} elseif (Get-Command docker-compose -ErrorAction SilentlyContinue) {
    $script:ComposeIsV2 = $false
    $composeVer = (docker-compose --version) -replace '.*?(\d+\.\d+\.\d+).*', '$1'
    Write-Warn "Using legacy docker-compose $composeVer. Upgrading to Docker Compose v2 is recommended."
} else {
    Write-Fail "Docker Compose not found.`n     Install Docker Desktop (it includes Compose) from https://docs.docker.com/desktop/install/windows-install/"
}

# Docker daemon
$null = docker info 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Fail "Docker daemon is not running. Start Docker Desktop and re-run this script."
}
Write-Ok "Docker daemon is running"

Write-Host ""
Write-Hr
Write-Host ""

# ── Configuration ────────────────────────────────────────────────────────────

Write-Info "Configuration (press Enter to accept defaults)"
Write-Host ""

$inputPort = Read-Host "    Expose TinVault on port [$DEFAULT_PORT]"
$PORT = if ($inputPort) { $inputPort } else { $DEFAULT_PORT }
if ($PORT -notmatch '^\d+$' -or [int]$PORT -lt 1 -or [int]$PORT -gt 65535) {
    Write-Fail "Invalid port: $PORT"
}

$securePass = Read-Host "    PostgreSQL password [Enter to auto-generate]" -AsSecureString
$bstr       = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePass)
$inputPass  = [Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)

if ([string]::IsNullOrEmpty($inputPass)) {
    $chars   = (65..90) + (97..122) + (48..57)
    $DB_PASS = -join ($chars | Get-Random -Count 32 | ForEach-Object { [char]$_ })
    Write-Warn "Auto-generated password (saved to .env): $DB_PASS"
} else {
    $DB_PASS = $inputPass
    Write-Ok "Password configured"
}

Write-Host ""

# ── Write config files ───────────────────────────────────────────────────────

Write-Info "Writing configuration..."
Write-Host ""

@"
POSTGRES_PASSWORD=$DB_PASS
PORT=$PORT
"@ | Set-Content -Path ".env" -Encoding UTF8
Write-Ok ".env created"

if (-not (Test-Path "docker-compose.yml")) {
    # Note: `${ } escapes the $ so docker compose variables are written literally
    @"
version: '3.9'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: tinvault
      POSTGRES_PASSWORD: `${POSTGRES_PASSWORD}
      POSTGRES_DB: tinvault
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U tinvault"]
      interval: 5s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  backend:
    image: $BACKEND_IMAGE
    environment:
      DATABASE_URL: postgres://tinvault:`${POSTGRES_PASSWORD}@postgres:5432/tinvault?sslmode=disable
      PORT: 8080
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped

  frontend:
    image: $FRONTEND_IMAGE
    ports:
      - "`${PORT}:80"
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  postgres_data:
"@ | Set-Content -Path "docker-compose.yml" -Encoding UTF8
    Write-Ok "docker-compose.yml created"
} else {
    Write-Warn "docker-compose.yml already exists -- skipping generation (using existing file)"
}

Write-Host ""
Write-Hr
Write-Host ""

# ── Pull & start ─────────────────────────────────────────────────────────────

Write-Info "Pulling images from Docker Hub..."
Write-Host ""
Invoke-Compose pull

Write-Host ""
Write-Info "Starting TinVault..."
Invoke-Compose up -d

Start-Sleep -Seconds 3

Write-Host ""
Write-Hr
Write-Host ""
Write-Ok "TinVault is running!"
Write-Host ""
Write-Host "    URL:  http://localhost:$PORT" -ForegroundColor White
Write-Host ""
Write-Host "  Useful commands:"
Write-Host "    Logs:    docker compose logs -f"
Write-Host "    Stop:    docker compose down"
Write-Host "    Update:  docker compose pull; docker compose up -d"
Write-Host "    Backup:  docker compose exec postgres pg_dump -U tinvault tinvault | Out-File backup.sql -Encoding UTF8"
Write-Host ""
Write-Host "  !  TinVault has no built-in authentication." -ForegroundColor Yellow
Write-Host "     For network or internet access, place it behind a reverse proxy" -ForegroundColor Yellow
Write-Host "     (Caddy, nginx, Traefik) with HTTPS and authentication enabled." -ForegroundColor Yellow
Write-Host "     See the README for configuration examples." -ForegroundColor Yellow
Write-Host ""
