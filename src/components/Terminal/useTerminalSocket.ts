'use client'

import { useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { connectTerminal, type TerminalSocket } from '@/lib/terminal/socket'
import type { Terminal } from '@xterm/xterm'
import { useTerminalStore } from '@/stores/terminalStore'

interface Options {
  sessionId: string
  clientSlug: string
  terminalRef: React.MutableRefObject<Terminal | null>
}

/** Get a fresh JWT — refreshes proactively if expiring within 5 min. */
async function getFreshJwt(): Promise<string | null> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null

  const expiresAt = session.expires_at ?? 0
  const nowSecs   = Math.floor(Date.now() / 1000)

  if (expiresAt - nowSecs < 5 * 60) {
    console.debug('[terminal] token expiring soon, refreshing...')
    const { data: refreshed, error } = await supabase.auth.refreshSession()
    if (error || !refreshed.session) {
      console.error('[terminal] session refresh failed:', error?.message)
      return null
    }
    return refreshed.session.access_token
  }

  return session.access_token
}

export function useTerminalSocket({ sessionId, clientSlug, terminalRef }: Options) {
  const socketRef = useRef<TerminalSocket | null>(null)
  const updateStatus = useTerminalStore((s) => s.updateStatus)
  const incrementUnread = useTerminalStore((s) => s.incrementUnread)
  const activeSessionId = useTerminalStore((s) => s.activeSessionId)
  const activeSessionIdRef = useRef(activeSessionId)
  activeSessionIdRef.current = activeSessionId

  const connect = useCallback(async () => {
    const jwt = await getFreshJwt()

    if (!jwt) {
      const msg = 'Sesión expirada — recargá la página para continuar'
      terminalRef.current?.writeln(`\r\n\x1b[31m[${msg}]\x1b[0m`)
      updateStatus(sessionId, 'error')
      return
    }

    updateStatus(sessionId, 'connecting')
    socketRef.current?.close()

    const term = terminalRef.current
    socketRef.current = connectTerminal({
      jwt,
      clientSlug,
      cols: term?.cols ?? 80,
      rows: term?.rows ?? 24,
      onData(data) {
        terminalRef.current?.write(data)
        if (activeSessionIdRef.current !== sessionId) {
          incrementUnread(sessionId)
        }
      },
      onReady() {
        updateStatus(sessionId, 'connected')
      },
      onError(msg) {
        terminalRef.current?.writeln(`\r\n\x1b[31m[Error: ${msg}]\x1b[0m`)
        updateStatus(sessionId, 'error')
      },
      onClose() {
        updateStatus(sessionId, 'disconnected')
        terminalRef.current?.writeln('\r\n\x1b[33m[Sesión cerrada — reconectando...]\x1b[0m')
      },
    })
  }, [sessionId, clientSlug, terminalRef, updateStatus, incrementUnread])

  const sendData = useCallback((data: string) => {
    socketRef.current?.send(data)
  }, [])

  const resize = useCallback((cols: number, rows: number) => {
    socketRef.current?.resize(cols, rows)
  }, [])

  useEffect(() => {
    // Give XtermInstance ~200ms to finish async dynamic import init
    const t = setTimeout(() => { connect() }, 200)

    // Re-connect on token refresh (Supabase emits TOKEN_REFRESHED)
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'TOKEN_REFRESHED') {
        console.debug('[terminal] token refreshed, reconnecting session', sessionId)
        connect()
      }
    })

    return () => {
      clearTimeout(t)
      subscription.unsubscribe()
      socketRef.current?.close()
      socketRef.current = null
    }
  }, [connect, sessionId])

  return { sendData, resize, reconnect: connect }
}
