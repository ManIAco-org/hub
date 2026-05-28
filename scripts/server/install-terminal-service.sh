#!/usr/bin/env bash
# install-terminal-service.sh — instala maniaco-terminal como systemd service en el host
# Prerequisito: .env debe existir en /opt/maniaco-terminal/.env
# Ejecutar como root: sudo bash /srv/maniacos/hub/scripts/server/install-terminal-service.sh
set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "Error: ejecutar como root (sudo bash $0)"
  exit 1
fi

SRC=/srv/maniacos/hub/terminal-service
DEST=/opt/maniaco-terminal
SERVICE=maniaco-terminal

# ── 1. Copiar código ──────────────────────────────────────────────────────────
echo "[install] Copiando terminal-service → $DEST"
mkdir -p "$DEST"
rsync -a --delete \
  --exclude=node_modules \
  --exclude='.env' \
  "$SRC/" "$DEST/"

# ── 2. Instalar dependencias ──────────────────────────────────────────────────
echo "[install] npm install --production..."
cd "$DEST"
npm install --production --no-audit --no-fund

# ── 3. Detectar path de node ──────────────────────────────────────────────────
NODE_BIN=$(command -v node 2>/dev/null || echo '')
if [[ -z "$NODE_BIN" ]]; then
  echo "Error: node no encontrado en PATH. Instalá Node.js >= 22 primero."
  exit 1
fi
echo "[install] node: $NODE_BIN ($(node --version))"

# ── 4. Crear systemd unit ─────────────────────────────────────────────────────
echo "[install] Creando /etc/systemd/system/$SERVICE.service"
cat > "/etc/systemd/system/$SERVICE.service" << UNIT
[Unit]
Description=ManIAcos Terminal Service
Documentation=https://github.com/ManIAco-org/hub/tree/master/terminal-service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$DEST
# El '-' hace que el EnvironmentFile sea opcional — no falla si no existe
EnvironmentFile=-$DEST/.env
ExecStart=$NODE_BIN $DEST/server.js
Restart=always
RestartSec=5
# Logging via journald
StandardOutput=journal
StandardError=journal
SyslogIdentifier=$SERVICE
# Límites razonables
LimitNOFILE=65536
LimitNPROC=4096

[Install]
WantedBy=multi-user.target
UNIT

# ── 5. Habilitar y (re)iniciar ────────────────────────────────────────────────
echo "[install] systemctl daemon-reload + enable + restart..."
systemctl daemon-reload
systemctl enable "$SERVICE"
systemctl restart "$SERVICE"

sleep 2

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║  maniaco-terminal instalado como systemd service     ║"
echo "╚══════════════════════════════════════════════════════╝"
systemctl status "$SERVICE" --no-pager -l || true
echo ""
echo "  Logs en tiempo real : journalctl -u $SERVICE -f"
echo "  Reiniciar           : systemctl restart $SERVICE"
echo "  Ver logs            : journalctl -u $SERVICE -n 50 --no-pager"
