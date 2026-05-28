#!/usr/bin/env bash
# install-cron.sh — instala el cron de auto-update en el servidor Oracle
# Ejecutar como root: sudo bash scripts/server/install-cron.sh
set -euo pipefail

CRON_DEST=/etc/cron.d/maniaco-auto-update
SCRIPT_SRC=/srv/maniacos/hub/scripts/server/auto-update.sh

if [[ $EUID -ne 0 ]]; then
  echo "Error: ejecutar como root (sudo bash $0)"
  exit 1
fi

# Verificar que el script existe
if [[ ! -f "$SCRIPT_SRC" ]]; then
  echo "Error: script no encontrado: $SCRIPT_SRC"
  echo "Asegurate de haber hecho git pull en /srv/maniacos/hub primero."
  exit 1
fi

chmod +x "$SCRIPT_SRC"
echo "[install-cron] Script source: $SCRIPT_SRC"

# Escribir cron entry
cat > "$CRON_DEST" << 'EOF'
# ManIAcos Auto-Update — domingos 04:00 UTC (01:00 Argentina)
# Actualiza hub repo + Docker services + limpia imágenes huérfanas
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin

0 4 * * 0 root /srv/maniacos/hub/scripts/server/auto-update.sh
EOF

chmod 644 "$CRON_DEST"
echo "[install-cron] Cron instalado en $CRON_DEST"

# Verificar que cron puede leerlo
if crontab -l -u root >/dev/null 2>&1 || true; then
  echo "[install-cron] Verificando cron..."
  cron --test-config 2>/dev/null && echo "[install-cron] Config OK" || echo "[install-cron] (cron --test-config no disponible, ignorar)"
fi

echo ""
echo "✓ Cron instalado. Próxima ejecución: domingo 04:00 UTC"
echo "  Logs en: /var/log/maniaco-updates.log"
echo "  Para probar ahora: sudo /srv/maniacos/hub/scripts/server/auto-update.sh"
