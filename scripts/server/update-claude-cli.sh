#!/usr/bin/env bash
# update-claude-cli.sh — actualiza Claude Code CLI para todos los users del servidor
# Cron: lunes 04:00 UTC (01:00 Argentina)
# Instalación del cron: sudo bash scripts/server/install-cron.sh
# O manual: sudo bash /srv/maniacos/hub/scripts/server/update-claude-cli.sh
set -euo pipefail

LOG=/var/log/claude-update.log

log() { echo "[$(date -Iseconds)] $*" | tee -a "$LOG"; }

log "=== Iniciando update de Claude Code CLI ==="

for user in franco lucho noe; do
  log "Actualizando claude para '$user'..."
  if id "$user" &>/dev/null; then
    # Corre npm install como el user para respetar su entorno (~/.nvm, etc.)
    sudo -u "$user" bash -lc 'npm install -g @anthropic-ai/claude-code 2>&1' \
      | while IFS= read -r line; do log "  [$user] $line"; done \
      && log "  [$user] ✓ OK" \
      || log "  [$user] ✗ FAILED (non-fatal)"
  else
    log "  [$user] user no existe en este servidor — salteando"
  fi
done

log "=== Update de Claude Code CLI completado ==="
