#!/usr/bin/env bash
# deploy.sh — Run este script en Oracle ARM para levantar el terminal service
# Uso: bash deploy.sh
set -euo pipefail

DEPLOY_DIR="/srv/maniacos/docker/terminal-service"
HOOKS_DIR="/srv/maniacos/hooks"
REPO_URL="https://github.com/ManIAco-org/hub.git"

log() { echo "[deploy] $*"; }

# ── Verificar prerrequisitos ───────────────────────────────────────────────────
command -v docker   >/dev/null || { echo "Error: docker no instalado"; exit 1; }
command -v tmux     >/dev/null || { echo "Error: tmux no instalado. Ejecutá: apt install tmux"; exit 1; }

# ── Crear estructura de directorios ───────────────────────────────────────────
log "Creando directorios..."
mkdir -p "$DEPLOY_DIR"
mkdir -p "$HOOKS_DIR"
mkdir -p /srv/maniacos/personal/franco
mkdir -p /srv/maniacos/personal/lucho
mkdir -p /srv/maniacos/personal/noe

# ── Copiar archivos del repo ───────────────────────────────────────────────────
log "Copiando archivos de terminal-service..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cp "$SCRIPT_DIR/server.js"          "$DEPLOY_DIR/"
cp "$SCRIPT_DIR/package.json"       "$DEPLOY_DIR/"
cp "$SCRIPT_DIR/Dockerfile"         "$DEPLOY_DIR/"
cp "$SCRIPT_DIR/docker-compose.yml" "$DEPLOY_DIR/"
cp "$SCRIPT_DIR/hooks/"*.sh         "$HOOKS_DIR/"
chmod +x "$HOOKS_DIR"/*.sh

# ── Verificar .env ────────────────────────────────────────────────────────────
if [[ ! -f "$DEPLOY_DIR/.env" ]]; then
  log "⚠  Copiando .env.example → .env — EDITÁ antes de continuar:"
  cp "$SCRIPT_DIR/.env.example" "$DEPLOY_DIR/.env"
  echo ""
  echo "  Editá $DEPLOY_DIR/.env con los valores reales de Vaultwarden:"
  echo "  - SUPABASE_JWT_SECRET"
  echo "  - SUPABASE_URL"
  echo "  - SUPABASE_SERVICE_ROLE_KEY"
  echo "  - UID/GID de cada usuario (ejecutá: id franco && id lucho && id noe)"
  echo ""
  echo "  Después volvé a ejecutar: bash deploy.sh"
  exit 0
fi

# ── Build + start ─────────────────────────────────────────────────────────────
log "Building Docker image..."
cd "$DEPLOY_DIR"
docker compose build --no-cache

log "Starting terminal service..."
docker compose up -d

log "Verificando health..."
sleep 3
curl -sf http://127.0.0.1:3001/health && echo " ✓ Health OK" || echo " ✗ Health check falló"

log "Done. Logs: docker compose -f $DEPLOY_DIR/docker-compose.yml logs -f"
