'use strict'

/**
 * ManIAcos Terminal Service — v1.0.0
 * WebSocket server: Express + ws + node-pty + JWT auth
 *
 * Protocol:
 *   1. Server → Client: {"type":"ready","version":"1.0.0"}
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
const express = require('express')
const { WebSocketServer } = require('ws')
const pty     = require('node-pty')
const jwt     = require('jsonwebtoken')

// ── Config ───────────────────────────────────────────────────────────────────
const PORT             = parseInt(process.env.PORT              ?? '3001', 10)
const JWT_SECRET       = process.env.SUPABASE_JWT_SECRET        ?? ''
const SUPABASE_URL     = process.env.SUPABASE_URL               ?? ''
const SUPABASE_SVC_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY  ?? ''

const MAX_SESSIONS_PER_USER = 3
const HEARTBEAT_MS          = 30_000           // 30 s
const IDLE_TIMEOUT_MS       = 30 * 60 * 1_000  // 30 min
const ROOT_PATH             = '/srv/maniacos'

// ── User map ─────────────────────────────────────────────────────────────────
// Supabase email → Linux identity on Oracle ARM.
// UIDs/GIDs are configurable via env vars; defaults match a typical fresh Ubuntu
// where the first non-root user gets 1000. Run `id <user>` on Oracle to confirm.
const USER_MAP = {
  'franco.sanmartin@maniaco.online': {
    linuxUser : 'franco',
    uid       : parseInt(process.env.UID_FRANCO ?? '1000', 10),
    gid       : parseInt(process.env.GID_FRANCO ?? '1000', 10),
    home      : '/home/franco',
  },
  'lucho@maniaco.online': {
    linuxUser : 'lucho',
    uid       : parseInt(process.env.UID_LUCHO  ?? '1001', 10),
    gid       : parseInt(process.env.GID_LUCHO  ?? '1001', 10),
    home      : '/home/lucho',
  },
  'noe@maniaco.online': {
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
  sendJson({ type: 'ready', version: '1.0.0' })

  // ── Message handler ──────────────────────────────────────────────────────────
  ws.on('message', (raw, isBinary) => {
    resetIdle()

    // ── Phase 1: auth handshake ────────────────────────────────────────────────
    if (!authenticated) {
      let msg
      try   { msg = JSON.parse(raw.toString()) }
      catch { ws.close(1008, 'invalid JSON'); return }

      if (msg.type !== 'auth') {
        ws.close(1008, 'expected auth message')
        return
      }

      // Require JWT secret to be configured
      if (!JWT_SECRET) {
        console.error('[terminal] SUPABASE_JWT_SECRET not configured')
        ws.close(1011, 'server misconfigured')
        return
      }

      // Validate JWT
      let payload
      try {
        payload = jwt.verify(msg.token, JWT_SECRET, { algorithms: ['HS256'] })
      } catch (err) {
        sendJson({ type: 'auth_error', message: 'Token inválido' })
        ws.close(1008, 'invalid token')
        return
      }

      userEmail = (payload.email ?? '').toLowerCase()
      userInfo  = USER_MAP[userEmail]

      if (!userInfo) {
        sendJson({ type: 'auth_error', message: `Usuario ${userEmail} no autorizado` })
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

      // ── Build tmux session name ────────────────────────────────────────────
      // Safe chars only (tmux restriction)
      const slugSafe = rawSlug
        ? rawSlug.replace(/[^a-z0-9_-]/gi, '_').slice(0, 40)
        : `personal_${userInfo.linuxUser}`
      sessionName = `maniaco_${userInfo.linuxUser}_${slugSafe}`

      const cols = Math.max(20, Math.min(500, msg.cols ?? 220))
      const rows = Math.max(5,  Math.min(200, msg.rows ?? 50))

      // ── Spawn tmux (-A = attach if exists, create if not) ──────────────────
      try {
        ptyProc = pty.spawn('tmux', ['new-session', '-A', '-s', sessionName], {
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

      console.log(`[terminal] auth OK: ${userEmail} → ${sessionName} (${cwd})`)
      sendJson({ type: 'auth_ok', user: userInfo.linuxUser, cwd, session: sessionName })

      auditLog(userEmail, userInfo.linuxUser, sessionName, 'session_start').catch(() => {})
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

  ws.on('close', ()        => { cleanup() })
  ws.on('error', (err)     => { console.error('[terminal] ws error:', err.message); cleanup() })
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
  console.log(`[terminal] v1.0.0 listening on 127.0.0.1:${PORT}`)
  if (!JWT_SECRET)       console.warn('[terminal] ⚠ SUPABASE_JWT_SECRET not set')
  if (!SUPABASE_SVC_KEY) console.warn('[terminal] ⚠ SUPABASE_SERVICE_ROLE_KEY not set — audit log disabled')
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
