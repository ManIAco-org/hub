#!/usr/bin/env bash
# session-start.sh — runs at the start of each terminal session
# Called by the terminal service after spawning the tmux session.
# Args: $1 = linuxUser, $2 = clientSlug (or "personal")
set -euo pipefail

LINUX_USER="${1:-}"
CLIENT_SLUG="${2:-personal}"
CWD="$(pwd)"

log() { echo "[session-start] $*" >&2; }

# ── Load session context if exists ────────────────────────────────────────────
CONTEXT_FILE="${CWD}/session-actual.md"
if [[ -f "$CONTEXT_FILE" ]]; then
  log "Context file found: $CONTEXT_FILE"
  echo ""
  echo "──────────────────────────────────────────"
  echo "  📋 Contexto de sesión anterior:"
  echo "──────────────────────────────────────────"
  cat "$CONTEXT_FILE"
  echo "──────────────────────────────────────────"
  echo ""
fi

# ── Git pull silencioso en proyecto ────────────────────────────────────────────
if [[ -d "${CWD}/.git" ]] && [[ "$CLIENT_SLUG" != "personal" ]]; then
  log "Pulling ${CWD}..."
  git -C "$CWD" pull --quiet --rebase --autostash 2>/dev/null \
    && log "Git pull OK" \
    || log "Git pull skipped (no remote or conflict)"
fi

log "Session start complete: user=${LINUX_USER} slug=${CLIENT_SLUG} cwd=${CWD}"
