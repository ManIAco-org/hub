#!/usr/bin/env bash
# session-end.sh — runs when a terminal session closes
# Commits WIP changes and updates session context.
# Args: $1 = linuxUser, $2 = clientSlug (or "personal")
set -euo pipefail

LINUX_USER="${1:-}"
CLIENT_SLUG="${2:-personal}"
CWD="$(pwd)"
TIMESTAMP="$(date '+%Y-%m-%d %H:%M')"

log() { echo "[session-end] $*" >&2; }

# ── Skip personal terminal (no auto-commit) ───────────────────────────────────
if [[ "$CLIENT_SLUG" == "personal" ]]; then
  log "Personal terminal — skipping auto-commit"
  exit 0
fi

# ── WIP commit/push en proyecto ───────────────────────────────────────────────
if [[ -d "${CWD}/.git" ]]; then
  cd "$CWD"

  # Check for uncommitted changes
  if ! git diff --quiet || ! git diff --cached --quiet || [[ -n "$(git ls-files --others --exclude-standard)" ]]; then
    log "Uncommitted changes detected, creating WIP commit..."
    git add -A
    git commit \
      --author="$LINUX_USER <${LINUX_USER}@maniaco.online>" \
      -m "wip: auto-save sesión ${TIMESTAMP} [terminal]" \
      --quiet \
      && git push --quiet \
      && log "WIP commit pushed" \
      || log "WIP commit/push failed (non-fatal)"
  else
    log "No uncommitted changes in ${CWD}"
  fi
fi

log "Session end complete: user=${LINUX_USER} slug=${CLIENT_SLUG} cwd=${CWD}"
