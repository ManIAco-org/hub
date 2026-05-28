#!/usr/bin/env bash
# install-cron.sh — instala los crons de auto-update en el servidor Oracle
# Ejecutar como root: sudo bash scripts/server/install-cron.sh
set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "Error: ejecutar como root (sudo bash $0)"
  exit 1
fi

SCRIPTS=/srv/maniacos/hub/scripts/server

# ── Verificar que los scripts existen ────────────────────────────────────────
for script in auto-update.sh update-claude-cli.sh; do
  if [[ ! -f "$SCRIPTS/$script" ]]; then
    echo "Error: script no encontrado: $SCRIPTS/$script"
    echo "Asegurate de haber hecho git pull en /srv/maniacos/hub primero."
    exit 1
  fi
  chmod +x "$SCRIPTS/$script"
done

# ── Cron 1: auto-update semanal (domingos) ───────────────────────────────────
CRON_UPDATE=/etc/cron.d/maniaco-auto-update
cat > "$CRON_UPDATE" << 'EOF'
# ManIAcos Auto-Update — domingos 04:00 UTC (01:00 Argentina)
# Actualiza hub repo + Docker services + limpia imágenes huérfanas
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin

0 4 * * 0 root /srv/maniacos/hub/scripts/server/auto-update.sh >> /var/log/maniaco-updates.log 2>&1
EOF
chmod 644 "$CRON_UPDATE"
echo "[install-cron] Auto-update instalado en $CRON_UPDATE"

# ── Cron 2: actualizar Claude Code CLI (lunes) ───────────────────────────────
CRON_CLAUDE=/etc/cron.d/maniaco-claude-update
cat > "$CRON_CLAUDE" << 'EOF'
# ManIAcos Claude CLI Update — lunes 04:00 UTC (01:00 Argentina)
# Actualiza @anthropic-ai/claude-code para franco, lucho y noe
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin

0 4 * * 1 root /srv/maniacos/hub/scripts/server/update-claude-cli.sh >> /var/log/claude-update.log 2>&1
EOF
chmod 644 "$CRON_CLAUDE"
echo "[install-cron] Claude CLI update instalado en $CRON_CLAUDE"

echo ""
echo "✓ Crons instalados:"
echo "  Domingos 04:00 UTC → auto-update (repo + Docker)"
echo "  Lunes   04:00 UTC → claude CLI update (franco/lucho/noe)"
echo ""
echo "  Logs:"
echo "    /var/log/maniaco-updates.log"
echo "    /var/log/claude-update.log"
echo ""
echo "  Para probar ahora:"
echo "    sudo $SCRIPTS/auto-update.sh"
echo "    sudo $SCRIPTS/update-claude-cli.sh"
