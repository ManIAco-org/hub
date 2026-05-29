'use strict'

/**
 * ManIAcos Terminal Service — v1.3.0
 * WebSocket server: Express + ws + node-pty + Supabase Auth
 *
 * Protocol:
 *   1. Server → Client: {"type":"ready","version":"1.1.0"}
 *   2. Client → Server: {"type":"auth","token":"<supabase JWT>","clientSlug":"rc-repuestos","cols":220,"rows":50}
 *   3. Server → Client: {"type":"auth_ok","user":"franco","cwd":"/srv/maniacos/rc-repuestos","session":"maniaco_franco_rc-repuestos"}
 *   4. Bidirectional raw terminal data (string frames)
 *   5. Client → Server: {"type":"resize","cols":220,"rows":50}
 *   6. Server → Client: {"type":"heartbeat"} every 30s
 *   7. Client → Server: {"type":"pong"}
 *   8. Server → Client: {"type":"exit","code":0} on terminal exit
 */

const http    = require('http')
const path    = require('path')
const fs      = require('fs')
const { execSync } = require('child_process')
const express = require('express')
const { WebSocketServer } = require('ws')
const pty     = require('node-pty')
const { createClient } = require('@supabase/supabase-js')

// ── Config ───────────────────────────────────────────────────────────────────
const PORT             = parseInt(process.env.PORT              ?? '3001', 10)
const SUPABASE_URL     = process.env.SUPABASE_URL               ?? ''
const SUPABASE_SVC_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY  ?? ''

// Supabase client for token validation (uses service role key — server-side only)
// supabase.auth.getUser(token) validates any Supabase JWT regardless of algorithm.
const supabase = SUPABASE_URL && SUPABASE_SVC_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SVC_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null

const MAX_SESSIONS_PER_USER = 10
const HEARTBEAT_MS          = 30_000           // 30 s
const IDLE_TIMEOUT_MS       = 30 * 60 * 1_000  // 30 min
const ROOT_PATH             = '/srv/maniacos'

// ── User map ─────────────────────────────────────────────────────────────────
// Supabase email → Linux identity on Oracle ARM.
// contacto@maniaco.online is intentionally absent — institutional account, no terminal.
// UIDs/GIDs are configurable via env vars; defaults match a typical fresh Ubuntu
// where the first non-root user gets 1000. Run `id <user>` on Oracle to confirm.
const USER_MAP = {
  'franco.sanmartin@maniaco.online': {
    linuxUser : 'franco',
    uid       : parseInt(process.env.UID_FRANCO ?? '1000', 10),
    gid       : parseInt(process.env.GID_FRANCO ?? '1000', 10),
    home      : '/home/franco',
  },
  'luis.giannasi@maniaco.online': {
    linuxUser : 'lucho',
    uid       : parseInt(process.env.UID_LUCHO  ?? '1001', 10),
    gid       : parseInt(process.env.GID_LUCHO  ?? '1001', 10),
    home      : '/home/lucho',
  },
  'noelia.bottallo@maniaco.online': {
    linuxUser : 'noe',
    uid       : parseInt(process.env.UID_NOE    ?? '1002', 10),
    gid       : parseInt(process.env.GID_NOE    ?? '1002', 10),
    home      : '/home/noe',
  },
}

// ── Session tracking ─────────────────────────────────────────────────────────
/** @type {Map<string, Set<import('ws').WebSocket>>} */
const activeSessions = new Map()

// ── HTTP + WebSocket server ──────────────────────────────────────────────────
const app    = express()
const server = http.createServer(app)
const wss    = new WebSocketServer({ server, path: '/ws-terminal' })

// Health endpoint — Caddy uses this for upcheck
app.get('/health', (_req, res) => {
  const sessions = {}
  for (const [email, set] of activeSessions) {
    sessions[email] = set.size
  }
  res.json({
    status   : 'ok',
    uptime   : process.uptime(),
    sessions,
  })
})

// ── Connection handler ───────────────────────────────────────────────────────
wss.on('connection', (ws, req) => {
  const remoteIp = req.socket.remoteAddress ?? 'unknown'
  console.log(`[terminal] connect from ${remoteIp}`)

  /** @type {ReturnType<typeof pty.spawn> | null} */
  let ptyProc        = null
  let userEmail      = ''
  let userInfo       = null
  let sessionName    = ''
  let authenticated  = false
  let heartbeatTimer = null
  let idleTimer      = null

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const sendJson = (payload) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(payload))
    }
  }

  const resetIdle = () => {
    if (idleTimer) clearTimeout(idleTimer)
    idleTimer = setTimeout(() => {
      sendJson({ type: 'error', message: 'Sesión cerrada por inactividad (30 min)' })
      ws.close(1000, 'idle timeout')
    }, IDLE_TIMEOUT_MS)
  }

  const cleanup = () => {
    if (heartbeatTimer) clearInterval(heartbeatTimer)
    if (idleTimer)      clearTimeout(idleTimer)
    if (userEmail)      activeSessions.get(userEmail)?.delete(ws)
    if (ptyProc) {
      try { ptyProc.kill() } catch { /* already dead */ }
      ptyProc = null
    }
    if (userEmail && sessionName) {
      auditLog(userEmail, userInfo?.linuxUser ?? '', sessionName, 'session_end').catch(() => {})
    }
    console.log(`[terminal] disconnect ${userEmail || remoteIp}`)
  }

  // ── Announce ready ───────────────────────────────────────────────────────────
  sendJson({ type: 'ready', version: '1.1.0' })

  // ── Message handler ──────────────────────────────────────────────────────────
  ws.on('message', (raw, isBinary) => {
    resetIdle()

    // ── Phase 1: auth handshake (async) ───────────────────────────────────────
    if (!authenticated) {
      let msg
      try   { msg = JSON.parse(raw.toString()) }
      catch { ws.close(1008, 'invalid JSON'); return }

      if (msg.type !== 'auth') {
        ws.close(1008, 'expected auth message')
        return
      }

      // Delegate async auth to inner function
      handleAuth(ws, msg).catch((err) => {
        console.error('[auth] unexpected error:', err.message)
        sendJson({ type: 'auth_error', message: 'Error interno de autenticación' })
        ws.close(1011, 'auth error')
      })
      return
    }

    // ── Phase 2: live terminal data ────────────────────────────────────────────
    if (!ptyProc) return

    const data = raw.toString()

    // JSON control messages start with '{'
    if (!isBinary && data.charAt(0) === '{') {
      let msg
      try { msg = JSON.parse(data) }
      catch { ptyProc.write(data); return }

      switch (msg.type) {
        case 'resize': {
          const cols = Math.max(20, Math.min(500, msg.cols ?? 80))
          const rows = Math.max(5,  Math.min(200, msg.rows ?? 24))
          try { ptyProc.resize(cols, rows) } catch { /* terminal may be closing */ }
          break
        }
        case 'pong':
          // Heartbeat ack — idle timer already reset above
          break
        default:
          // Unknown control → pass through to terminal
          ptyProc.write(data)
      }
      return
    }

    // Raw input → pty
    ptyProc.write(isBinary ? raw.toString('utf8') : data)
  })

  ws.on('close', ()    => { cleanup() })
  ws.on('error', (err) => { console.error('[terminal] ws error:', err.message); cleanup() })

  // ── Auth handler (async) ─────────────────────────────────────────────────────
  async function handleAuth(ws, msg) {
    // Require Supabase to be configured
    if (!supabase) {
      console.error('[auth] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not configured')
      sendJson({ type: 'auth_error', message: 'Servidor mal configurado (falta SUPABASE_URL o SERVICE_ROLE_KEY)' })
      ws.close(1011, 'server misconfigured')
      return
    }

    // Validate token via Supabase — works with any JWT algorithm (HS256, ES256, RS256)
    console.log('[auth] validating token (len=%d, clientSlug=%s)', msg.token?.length ?? 0, JSON.stringify(msg.clientSlug))
    const { data, error } = await supabase.auth.getUser(msg.token)

    if (error || !data?.user) {
      console.error('[auth] getUser failed:', error?.message ?? 'no user returned',
        '| status:', error?.status, '| code:', error?.code)
      sendJson({ type: 'auth_error', message: `Token inválido (${error?.message ?? 'no user'})` })
      ws.close(1008, 'invalid token')
      return
    }

    userEmail = (data.user.email ?? '').toLowerCase()
    userInfo  = USER_MAP[userEmail]

    console.log('[auth] token valid for:', userEmail)

    if (!userInfo) {
      const msg = userEmail === 'contacto@maniaco.online'
        ? 'Cuenta institucional sin terminal. Usá tu mail personal @maniaco.online'
        : `Usuario ${userEmail} no autorizado`
      console.warn('[auth] rejected:', userEmail)
      sendJson({ type: 'auth_error', message: msg })
      ws.close(1008, 'unauthorized email')
      return
    }

    // Rate limit: max N concurrent sessions per user
    if (!activeSessions.has(userEmail)) activeSessions.set(userEmail, new Set())
    const pool = activeSessions.get(userEmail)
    if (pool.size >= MAX_SESSIONS_PER_USER) {
      sendJson({ type: 'error', message: `Máximo ${MAX_SESSIONS_PER_USER} sesiones simultáneas` })
      ws.close(1013, 'session limit reached')
      return
    }

    // ── Resolve cwd with path traversal protection ─────────────────────────
    const rawSlug = (typeof msg.clientSlug === 'string' ? msg.clientSlug : '').trim()
    let cwd

    if (!rawSlug) {
      // General terminal: personal workspace
      cwd = `${ROOT_PATH}/personal/${userInfo.linuxUser}`
    } else {
      cwd = `${ROOT_PATH}/${rawSlug}`
    }

    // Resolve to canonical path and verify it stays under ROOT_PATH
    const resolved = path.resolve(cwd)
    if (!resolved.startsWith(ROOT_PATH + '/') && resolved !== ROOT_PATH) {
      sendJson({ type: 'auth_error', message: 'Ruta no permitida' })
      ws.close(1008, 'path traversal attempt')
      return
    }
    cwd = resolved

    // ── Auto-create cwd anywhere under /srv/maniacos/ ─────────────────────
    // Server runs as root via systemd — safe to mkdir + chown.
    if (!fs.existsSync(cwd)) {
      console.log(`[terminal] auto-creating cwd: ${cwd}`)
      try {
        fs.mkdirSync(cwd, { recursive: true, mode: 0o2775 })

        // Resolve linux user UID from the OS (fallback to USER_MAP value)
        let uid = userInfo.uid
        try { uid = parseInt(execSync(`id -u ${userInfo.linuxUser}`, { timeout: 2000 }).toString().trim(), 10) } catch { /* use map fallback */ }

        // Resolve maniacos group GID from the OS (fallback to env var or 2000)
        let maniacosGid = parseInt(process.env.GID_MANIACOS ?? '2000', 10)
        try { maniacosGid = parseInt(execSync('getent group maniacos | cut -d: -f3', { timeout: 2000 }).toString().trim(), 10) } catch { /* use env fallback */ }

        // chown every intermediate directory from ROOT_PATH down to cwd
        const rel   = cwd.slice(ROOT_PATH.length + 1) // strip "/srv/maniacos/" prefix
        const parts = rel.split('/').filter(Boolean)
        let acc = ROOT_PATH
        for (const part of parts) {
          acc += '/' + part
          try { fs.chownSync(acc, uid, maniacosGid) } catch { /* skip if can't chown */ }
        }
        console.log(`[terminal] auto-created ${cwd} owner=${userInfo.linuxUser}:maniacos (uid=${uid} gid=${maniacosGid})`)
      } catch (mkdirErr) {
        console.error(`[terminal] mkdir failed: ${mkdirErr.message}`)
        sendJson({ type: 'auth_error', message: `No se pudo crear la carpeta del proyecto: ${mkdirErr.message}` })
        ws.close(1011, 'mkdir failed')
        return
      }
    }

    // Final existence check (should always pass after mkdir)
    if (!fs.existsSync(cwd)) {
      console.error(`[terminal] cwd still missing after mkdir: ${cwd}`)
      sendJson({ type: 'auth_error', message: `Carpeta no accesible: ${cwd}` })
      ws.close(1008, 'cwd not found')
      return
    }

    // ── Build tmux session name ────────────────────────────────────────────
    const slugSafe = rawSlug
      ? rawSlug.replace(/[^a-z0-9_-]/gi, '_').slice(0, 40)
      : `personal_${userInfo.linuxUser}`
    const stableSession = `maniaco_${userInfo.linuxUser}_${slugSafe}`

    let wantsNew
    if (msg.targetSession && typeof msg.targetSession === 'string') {
      // Client specifies an exact tmux session to reattach to (switch-session flow).
      // Security: name must be owned by this linux user.
      const target = msg.targetSession.trim()
      if (target.startsWith(`maniaco_${userInfo.linuxUser}_`)) {
        sessionName = target
        wantsNew = false  // always use -A when reattaching a known session
        console.log(`[terminal] targetSession=${sessionName} → reattach mode`)
      } else {
        sendJson({ type: 'auth_error', message: 'Sesión no autorizada' })
        ws.close(1008, 'unauthorized target session')
        return
      }
    } else {
      // newSession=true → unique name (no -A) = completely fresh terminal
      // newSession=false → stable name with -A = attach-or-create (resume)
      wantsNew = msg.newSession !== false
      sessionName = wantsNew ? `${stableSession}_${Date.now()}` : stableSession
      console.log(`[terminal] newSession=${msg.newSession} → wantsNew=${wantsNew} → tmuxSession=${sessionName}`)
    }

    const cols = Math.max(20, Math.min(500, msg.cols ?? 220))
    const rows = Math.max(5,  Math.min(200, msg.rows ?? 50))

    // ── Get git branch for status bar ──────────────────────────────────────
    let gitBranch = ''
    try {
      gitBranch = execSync('git rev-parse --abbrev-ref HEAD', { cwd, timeout: 2000, stdio: ['ignore', 'pipe', 'ignore'] })
        .toString().trim()
    } catch { /* not a git repo or git unavailable */ }

    // ── Session startup command ────────────────────────────────────────────
    // New sessions auto-launch claude. Existing sessions (tmux -A attach)
    // ignore the command — the user is already in their running claude session.
    // If claude is not installed for this user, falls back to bash with a clear message.
    const sessionCmd = [
      'bash', '-c',
      [
        `cd ${JSON.stringify(cwd)}`,
        'source ~/.bashrc 2>/dev/null || true',
        '/srv/maniacos/hub/hooks/session-start.sh 2>/dev/null || true',
        // exec claude → replaces shell; exit closes the terminal cleanly.
        // Falls back to bash with a warning if claude is missing.
        `exec claude 2>/dev/null || (printf '\\033[33m[ claude no encontrado para ${userInfo.linuxUser} — instalá con: npm i -g @anthropic-ai/claude-code ]\\033[0m\\r\\n'; exec bash)`,
      ].join(' && '),
    ]

    // ── Spawn tmux ────────────────────────────────────────────────────────
    // wantsNew=true → 'new-session -s uniqueName' (always fresh)
    // wantsNew=false → 'new-session -A -s stableName' (attach-or-create)
    const tmuxArgs = wantsNew
      ? ['new-session', '-s', sessionName, ...sessionCmd]
      : ['new-session', '-A', '-s', sessionName, ...sessionCmd]

    try {
      ptyProc = pty.spawn('tmux', tmuxArgs, {
        name   : 'xterm-256color',
        cols, rows, cwd,
        env    : {
          ...process.env,
          HOME      : userInfo.home,
          USER      : userInfo.linuxUser,
          LOGNAME   : userInfo.linuxUser,
          SHELL     : '/bin/bash',
          TERM      : 'xterm-256color',
          COLORTERM : 'truecolor',
        },
        uid: userInfo.uid,
        gid: userInfo.gid,
      })
    } catch (err) {
      console.error('[terminal] pty spawn failed:', err.message)
      sendJson({ type: 'error', message: 'No se pudo iniciar la terminal' })
      ws.close(1011, 'pty spawn error')
      return
    }

    authenticated = true
    pool.add(ws)

    // pty → WS raw output
    ptyProc.onData((data) => {
      resetIdle()
      if (ws.readyState === ws.OPEN) ws.send(data)
    })

    ptyProc.onExit(({ exitCode }) => {
      console.log(`[terminal] session ${sessionName} exited (code ${exitCode ?? 'unknown'})`)
      sendJson({ type: 'exit', code: exitCode ?? 0 })
      ws.close(1000, 'terminal exited')
    })

    // Heartbeat pump
    heartbeatTimer = setInterval(() => {
      sendJson({ type: 'heartbeat' })
    }, HEARTBEAT_MS)

    console.log(`[terminal] auth OK: ${userEmail} → ${sessionName} (${cwd}) branch=${gitBranch || 'none'}`)
    sendJson({ type: 'auth_ok', user: userInfo.linuxUser, cwd, session: sessionName, gitBranch })

    auditLog(userEmail, userInfo.linuxUser, sessionName, 'session_start').catch(() => {})
  }
})

// ── Audit log (Supabase agent_runs) ─────────────────────────────────────────
async function auditLog(email, linuxUser, sessionName, event) {
  if (!SUPABASE_URL || !SUPABASE_SVC_KEY) return
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/agent_runs`, {
      method : 'POST',
      headers: {
        'Content-Type' : 'application/json',
        'apikey'       : SUPABASE_SVC_KEY,
        'Authorization': `Bearer ${SUPABASE_SVC_KEY}`,
        'Prefer'       : 'return=minimal',
      },
      body: JSON.stringify({
        agent_name    : 'terminal-service',
        status        : 'success',
        input_payload : {
          email,
          linuxUser,
          sessionName,
          event,
          ts: new Date().toISOString(),
        },
      }),
    })
    if (!res.ok) {
      const txt = await res.text().catch(() => '')
      console.error(`[terminal] audit log HTTP ${res.status}: ${txt}`)
    }
  } catch (err) {
    console.error('[terminal] audit log error:', err.message)
  }
}

// ── Start ────────────────────────────────────────────────────────────────────
server.listen(PORT, '127.0.0.1', () => {
  console.log(`[terminal] v1.6.0 listening on 127.0.0.1:${PORT}`)
  if (!SUPABASE_URL)     console.warn('[terminal] ⚠ SUPABASE_URL not set — auth will fail')
  if (!SUPABASE_SVC_KEY) console.warn('[terminal] ⚠ SUPABASE_SERVICE_ROLE_KEY not set — auth + audit log disabled')
  if (supabase)          console.log('[terminal] Supabase client ready (auth via getUser)')
})

// Graceful shutdown on SIGTERM (Docker stop)
process.on('SIGTERM', () => {
  console.log('[terminal] SIGTERM received, shutting down...')
  wss.clients.forEach((ws) => ws.close(1001, 'server shutting down'))
  server.close(() => {
    console.log('[terminal] Server closed')
    process.exit(0)
  })
  setTimeout(() => process.exit(1), 5000)
})
