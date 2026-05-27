const WS_URL =
  process.env.NEXT_PUBLIC_TERMINAL_WS_URL ?? 'wss://term.maniaco.online/ws-terminal'

export interface TerminalReadyInfo {
  user: string
  cwd: string
  session: string
}

export interface ConnectOptions {
  jwt: string
  /** Empty string = personal workspace (/srv/maniacos/personal/<user>).
   *  Any other value = /srv/maniacos/<slug>. */
  clientSlug: string
  cols: number
  rows: number
  onData: (data: string) => void
  onReady: (info: TerminalReadyInfo) => void
  onError: (msg: string) => void
  onClose: () => void
}

export interface TerminalSocket {
  send: (data: string) => void
  resize: (cols: number, rows: number) => void
  close: () => void
}

export function connectTerminal(opts: ConnectOptions): TerminalSocket {
  let ws: WebSocket | null = null
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let reconnectAttempt = 0
  let closed = false
  let authed = false

  function clearTimers() {
    if (heartbeatTimer !== null) { clearInterval(heartbeatTimer); heartbeatTimer = null }
    if (reconnectTimer !== null) { clearTimeout(reconnectTimer); reconnectTimer = null }
  }

  function scheduleReconnect() {
    if (closed) return
    const delay = Math.min(1_000 * Math.pow(2, reconnectAttempt), 30_000)
    reconnectAttempt++
    console.debug(`[terminal] reconnect #${reconnectAttempt} in ${delay}ms`)
    reconnectTimer = setTimeout(() => { if (!closed) connect() }, delay)
  }

  function connect() {
    console.debug('[terminal] connecting to', WS_URL)
    ws = new WebSocket(WS_URL)
    authed = false

    ws.onopen = () => {
      console.debug('[terminal] WS open, waiting for ready...')
      reconnectAttempt = 0
    }

    ws.onmessage = (event: MessageEvent) => {
      if (typeof event.data !== 'string') return

      let msg: Record<string, unknown> | null = null
      try { msg = JSON.parse(event.data) } catch { /* raw terminal data */ }

      if (msg) {
        switch (msg.type) {
          case 'ready': {
            const authPayload = {
              type: 'auth',
              token: opts.jwt,
              clientSlug: opts.clientSlug,   // "" = personal, else project slug
              cols: opts.cols,
              rows: opts.rows,
            }
            console.debug('[terminal] → auth', { clientSlug: authPayload.clientSlug, cols: authPayload.cols, rows: authPayload.rows })
            ws!.send(JSON.stringify(authPayload))
            break
          }
          case 'auth_ok':
            authed = true
            console.debug('[terminal] auth_ok', msg)
            opts.onReady({
              user:    String(msg.user    ?? ''),
              cwd:     String(msg.cwd     ?? ''),
              session: String(msg.session ?? ''),
            })
            // Start heartbeat responder
            heartbeatTimer = setInterval(() => {
              if (ws?.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'pong' }))
              }
            }, 25_000)
            break

          case 'auth_error': {
            // Authentication rejected — do NOT reconnect (wrong creds/user)
            const errMsg = String(msg.message ?? 'Autenticación rechazada')
            console.error('[terminal] auth_error:', errMsg)
            opts.onError(errMsg)
            closed = true       // prevent reconnect loop on auth failures
            clearTimers()
            ws?.close(1000, 'auth_error')
            break
          }

          case 'heartbeat':
            if (ws?.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'pong' }))
            }
            break

          case 'error': {
            const errMsg = String(msg.message ?? 'Error del servidor')
            console.error('[terminal] server error:', errMsg)
            opts.onError(errMsg)
            break
          }

          case 'exit':
            console.debug('[terminal] terminal exited')
            opts.onClose()
            break

          default:
            console.debug('[terminal] unknown message type:', msg.type)
        }
      } else if (authed) {
        // Raw terminal output
        opts.onData(event.data)
      }
    }

    ws.onclose = (event) => {
      console.debug('[terminal] WS closed:', event.code, event.reason)
      clearTimers()
      if (!closed) {
        opts.onClose()
        scheduleReconnect()
      }
    }

    ws.onerror = (event) => {
      console.error('[terminal] WS error:', event)
      opts.onError('Error de conexión WebSocket')
    }
  }

  connect()

  return {
    send(data: string) {
      if (ws?.readyState === WebSocket.OPEN && authed) ws.send(data)
    },
    resize(cols: number, rows: number) {
      if (ws?.readyState === WebSocket.OPEN && authed) {
        ws.send(JSON.stringify({ type: 'resize', cols, rows }))
      }
    },
    close() {
      closed = true
      clearTimers()
      ws?.close()
    },
  }
}
