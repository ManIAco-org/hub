#!/usr/bin/env bash
# auto-update.sh — actualización semanal de servicios en Oracle ARM
# Cron: domingos 04:00 UTC (01:00 Argentina)
# Instalación: sudo bash scripts/server/install-cron.sh
set -e

LOG=/var/log/maniaco-updates.log

log() { echo "[$(date -Iseconds)] $*" | tee -a "$LOG"; }

log "=== Iniciando auto-update ManIAcos ==="

# ── Hub repo ──────────────────────────────────────────────────────────────────
HUB_DIR=/srv/maniacos/hub
if [ -d "$HUB_DIR/.git" ]; then
  log "Actualizando hub repo..."
  cd "$HUB_DIR"
  git pull --rebase --autostash >> "$LOG" 2>&1 && log "Hub: git pull OK" || log "Hub: git pull FAILED (non-fatal)"
else
  log "Hub repo no encontrado en $HUB_DIR — salteando git pull"
fi

# ── Docker services ───────────────────────────────────────────────────────────
SERVICES=(vaultwarden n8n portainer uptime-kuma terminal-service)

for service in "${SERVICES[@]}"; do
  dir="/srv/maniacos/docker/$service"
  if [ -d "$dir" ]; then
    log "Actualizando $service..."
    cd "$dir"
    docker compose pull >> "$LOG" 2>&1 \
      && docker compose up -d >> "$LOG" 2>&1 \
      && log "$service: actualizado OK" \
      || log "$service: update FAILED (non-fatal, servicio puede seguir corriendo)"
  else
    log "$service: directorio $dir no encontrado — salteando"
  fi
done

# ── Limpieza de imágenes huérfanas ────────────────────────────────────────────
log "Limpiando imágenes Docker no usadas..."
docker image prune -f >> "$LOG" 2>&1 && log "Prune OK"

log "=== Auto-update completo ==="
