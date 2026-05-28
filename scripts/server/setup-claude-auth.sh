#!/usr/bin/env bash
# setup-claude-auth.sh — verifica y guía el login de Claude Code para un user del server
# Ejecutar como el USER LINUX que quiere autenticarse (NO como root):
#   ssh franco@oracle.maniaco.online
#   bash /srv/maniacos/hub/scripts/server/setup-claude-auth.sh
set -euo pipefail

USER=$(whoami)
CREDS="$HOME/.config/claude/credentials.json"

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║  ManIAcos — Setup Claude Code Auth para '$USER'      ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# ── Verificar que claude CLI está disponible ──────────────────────────────────
if ! command -v claude >/dev/null 2>&1; then
  echo "❌  Claude Code CLI no encontrado en PATH."
  echo "    Instalá desde: https://claude.ai/download"
  echo ""
  exit 1
fi

CLAUDE_VERSION=$(claude --version 2>/dev/null | head -1 || echo "desconocido")
echo "✓  Claude Code: $CLAUDE_VERSION"

# ── Verificar si ya está autenticado ─────────────────────────────────────────
if [[ -f "$CREDS" ]]; then
  echo "✓  Credenciales encontradas en: $CREDS"
  echo ""

  # Intentar un comando simple para verificar que funciona
  if claude --help >/dev/null 2>&1; then
    echo "✓  Estado: AUTENTICADO"
    echo ""

    # Mostrar cuenta activa si el JSON lo tiene
    if command -v jq >/dev/null 2>&1; then
      ACCOUNT=$(jq -r '.oauth.account_email // .email // "desconocido"' "$CREDS" 2>/dev/null || echo "—")
      echo "  Cuenta: $ACCOUNT"
    fi

    echo ""
    echo "Todo OK. Podés abrir la terminal del Hub y Claude Code estará listo."
  else
    echo "⚠  Credenciales presentes pero claude no responde correctamente."
    echo "   Considerá volver a hacer login."
    goto_login
  fi
else
  echo "⚠  No hay credenciales guardadas para '$USER'."
  echo ""
  goto_login
fi

goto_login() {
  echo "──────────────────────────────────────────"
  echo "  Para autenticarte, ejecutá:"
  echo ""
  echo "    claude /login"
  echo ""
  echo "  Esto abrirá un link de browser. Iniciá sesión con tu cuenta"
  echo "  Anthropic @maniaco.online (la misma que usás en tu laptop)."
  echo ""
  echo "  Una vez completado, volvé a correr este script para verificar."
  echo "──────────────────────────────────────────"
}
