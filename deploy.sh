#!/usr/bin/env bash
# TinVault deploy script
# Checks dependencies, configures, pulls from Docker Hub, and starts TinVault.
# Usage: bash deploy.sh
set -euo pipefail

BACKEND_IMAGE="tcush89/tinvault-backend:latest"
FRONTEND_IMAGE="tcush89/tinvault-frontend:latest"
DEFAULT_PORT=3000

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'

ok()   { echo -e "  ${GREEN}✓${NC}  $1"; }
warn() { echo -e "  ${YELLOW}⚠${NC}  $1"; }
fail() { echo -e "\n  ${RED}✗${NC}  $1\n"; exit 1; }
info() { echo -e "  ${BLUE}→${NC}  $1"; }
hr()   { echo "  ─────────────────────────────────────────"; }

echo ""
echo -e "  ${BOLD}TinVault — Self-Hosted Tobacco Cellar${NC}"
hr
echo ""

# ── Dependency checks ────────────────────────────────────────────────────────

info "Checking dependencies..."
echo ""

# Docker
if ! command -v docker &>/dev/null; then
    fail "Docker is not installed.\n     Install it from https://docs.docker.com/get-docker/ and re-run this script."
fi
DOCKER_VER=$(docker --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
ok "Docker ${DOCKER_VER}"

# Docker Compose (v2 plugin or standalone v1)
if docker compose version &>/dev/null 2>&1; then
    COMPOSE="docker compose"
    COMPOSE_VER=$(docker compose version --short 2>/dev/null || docker compose version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
    ok "Docker Compose ${COMPOSE_VER}"
elif command -v docker-compose &>/dev/null; then
    COMPOSE="docker-compose"
    COMPOSE_VER=$(docker-compose --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
    warn "Using legacy docker-compose ${COMPOSE_VER}. Upgrading to Docker Compose v2 is recommended."
else
    fail "Docker Compose is not installed.\n     Install it from https://docs.docker.com/compose/install/ and re-run this script."
fi

# Docker daemon
if ! docker info &>/dev/null 2>&1; then
    fail "Docker daemon is not running. Start Docker Desktop (or run: sudo systemctl start docker) and re-run this script."
fi
ok "Docker daemon is running"

# openssl or /dev/urandom for password generation
if command -v openssl &>/dev/null || [[ -r /dev/urandom ]]; then
    ok "Password generator available"
else
    warn "Neither openssl nor /dev/urandom found — you will need to set a password manually."
fi

echo ""
hr
echo ""

# ── Configuration ────────────────────────────────────────────────────────────

info "Configuration (press Enter to accept defaults)"
echo ""

# Port
read -rp "    Expose TinVault on port [${DEFAULT_PORT}]: " INPUT_PORT
PORT="${INPUT_PORT:-$DEFAULT_PORT}"
if ! [[ "$PORT" =~ ^[0-9]+$ ]] || (( PORT < 1 || PORT > 65535 )); then
    fail "Invalid port: ${PORT}"
fi

# Password
read -rsp "    PostgreSQL password [Enter to auto-generate]: " INPUT_PASS
echo ""
if [[ -z "${INPUT_PASS:-}" ]]; then
    if command -v openssl &>/dev/null; then
        DB_PASS=$(openssl rand -base64 32 | tr -dc 'A-Za-z0-9' | head -c 32)
    else
        DB_PASS=$(LC_ALL=C tr -dc 'A-Za-z0-9' < /dev/urandom | head -c 32)
    fi
    warn "Auto-generated password (see .env): ${DB_PASS}"
else
    DB_PASS="${INPUT_PASS}"
    ok "Password configured"
fi

echo ""

# ── Write config files ───────────────────────────────────────────────────────

info "Writing configuration..."
echo ""

cat > .env <<EOF
POSTGRES_PASSWORD=${DB_PASS}
PORT=${PORT}
EOF
ok ".env created"

# Generate docker-compose.yml only if one does not already exist
if [[ ! -f docker-compose.yml ]]; then
cat > docker-compose.yml <<COMPOSE
version: '3.9'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: tinvault
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD}
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
    image: ${BACKEND_IMAGE}
    environment:
      DATABASE_URL: postgres://tinvault:\${POSTGRES_PASSWORD}@postgres:5432/tinvault?sslmode=disable
      PORT: 8080
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped

  frontend:
    image: ${FRONTEND_IMAGE}
    ports:
      - "\${PORT}:80"
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  postgres_data:
COMPOSE
    ok "docker-compose.yml created"
else
    warn "docker-compose.yml already exists — skipping generation (using existing file)"
fi

echo ""
hr
echo ""

# ── Pull & start ─────────────────────────────────────────────────────────────

info "Pulling images from Docker Hub..."
echo ""
$COMPOSE pull

echo ""
info "Starting TinVault..."
$COMPOSE up -d

# Brief wait for startup
sleep 3

echo ""
hr
echo ""
ok "TinVault is running!"
echo ""
echo -e "    URL:  ${BOLD}http://localhost:${PORT}${NC}"
echo ""
echo "  Useful commands:"
echo "    Logs:    ${COMPOSE} logs -f"
echo "    Stop:    ${COMPOSE} down"
echo "    Update:  ${COMPOSE} pull && ${COMPOSE} up -d"
echo "    Backup:  ${COMPOSE} exec postgres pg_dump -U tinvault tinvault > backup.sql"
echo ""
echo "  ⚠  TinVault has no built-in authentication."
echo "     For network or internet access, place it behind a reverse proxy"
echo "     (Caddy, nginx, Traefik) with HTTPS and authentication enabled."
echo "     See the README for configuration examples."
echo ""
