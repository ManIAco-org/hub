#!/usr/bin/env bash
# migrate-terminal-from-docker.sh — migra terminal-service de Docker → systemd host
#
# QUÉ HACE:
#   1. Baja el container Docker de terminal-service
#   2. Copia el .env a /opt/maniaco-terminal/.env
#   3. Llama a install-terminal-service.sh (copia código, npm i, systemd unit)
#   4. Verifica que el servicio arrancó OK
#
# POR QUÉ SYSTEMD EN HOST:
#   Claude CLI, los usuarios franco/lucho/noe y los directorios del proyecto
#   viven en el host Oracle. El container Docker está aislado y no puede
#   acceder a ninguno de ellos. Corriendo en el host directamente como root,
#   node-pty puede hacer setuid spawn como los usuarios reales.
#
# PREREQUISITO: git pull en /srv/maniacos/hub primero.
# Ejecutar como root: sudo bash /srv/maniacos/hub/scripts/server/migrate-terminal-from-docker.sh
set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "Error: ejecutar como root (sudo bash $0)"
  exit 1
fi

DOCKER_DIR=/srv/maniacos/docker/terminal-service
DEST=/opt/maniaco-terminal
SCRIPTS=/srv/maniacos/hub/scripts/server
HUB_DIR=/srv/maniacos/hub

# ── 0. Asegurar hub repo actualizado ─────────────────────────────────────────
echo "[migrate] Verificando hub repo..."
if [[ ! -d "$HUB_DIR/.git" ]]; then
  echo "Error: $HUB_DIR no es un repo git. Cloná primero."
  exit 1
fi
cd "$HUB_DIR"
git pull --rebase --autostash || echo "[migrate] ⚠ git pull falló (non-fatal, continuando)"

# ── 1. Bajar container Docker ────────────────────────────────────────────────
echo "[migrate] Bajando container Docker terminal-service..."
if [[ -f "$DOCKER_DIR/docker-compose.yml" ]]; then
  cd "$DOCKER_DIR"
  docker compose down || true
  echo "[migrate] Container detenido."
else
  echo "[migrate] No se encontró docker-compose.yml en $DOCKER_DIR — salteando."
fi

# ── 2. Copiar .env ────────────────────────────────────────────────────────────
echo "[migrate] Preparando .env en $DEST..."
mkdir -p "$DEST"

if [[ -f "$DOCKER_DIR/.env" ]]; then
  cp "$DOCKER_DIR/.env" "$DEST/.env"
  echo "[migrate] .env copiado desde $DOCKER_DIR/.env"
  echo "[migrate] Contenido actual de .env (keys only):"
  grep -v '^\s*#' "$DEST/.env" | grep '=' | cut -d= -f1 | sed 's/^/  /'
elif [[ -f "$DEST/.env" ]]; then
  echo "[migrate] .env ya existe en $DEST, manteniéndolo."
else
  echo ""
  echo "⚠ ATENCIÓN: No se encontró .env en $DOCKER_DIR"
  echo "  Creá $DEST/.env con el siguiente contenido antes de continuar:"
  echo ""
  echo "    SUPABASE_URL=https://teyqamjfsfewusqjcfcy.supabase.co"
  echo "    SUPABASE_SERVICE_ROLE_KEY=eyJhbGci..."
  echo "    PORT=3001"
  echo ""
  echo "  Luego corré: sudo bash $SCRIPTS/install-terminal-service.sh"
  exit 1
fi

# ── 3. Validar vars mínimas en .env ──────────────────────────────────────────
source "$DEST/.env" 2>/dev/null || true
if [[ -z "${SUPABASE_URL:-}" ]] || [[ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]]; then
  echo ""
  echo "⚠ .env incompleto — faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY"
  echo "  Editá $DEST/.env y volvé a correr este script."
  exit 1
fi
echo "[migrate] .env validado OK (SUPABASE_URL y SERVICE_ROLE_KEY presentes)"

# ── 4. Instalar servicio ──────────────────────────────────────────────────────
echo "[migrate] Instalando servicio systemd..."
bash "$SCRIPTS/install-terminal-service.sh"

# ── 5. Verificar ─────────────────────────────────────────────────────────────
echo ""
echo "[migrate] Verificando servicio..."
sleep 2
if systemctl is-active --quiet maniaco-terminal; then
  echo "✓ maniaco-terminal está corriendo"
else
  echo "✗ El servicio no arrancó. Revisá con:"
  echo "    journalctl -u maniaco-terminal -n 30 --no-pager"
  exit 1
fi

echo ""
echo "Últimos logs del servicio:"
journalctl -u maniaco-terminal -n 15 --no-pager || true

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  Migración completada.                                       ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  Caddy sigue apuntando a localhost:3001 — sin cambios.       ║"
echo "║                                                              ║"
echo "║  Para limpiar Docker (opcional):                             ║"
echo "║    cd /srv/maniacos/docker/terminal-service                  ║"
echo "║    docker compose rm -f                                      ║"
echo "║    docker image prune -f                                     ║"
echo "╚══════════════════════════════════════════════════════════════╝"
