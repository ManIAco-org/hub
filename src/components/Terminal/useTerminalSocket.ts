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
  const updateStatus    = useTerminalStore((s) => s.updateStatus)
  const incrementUnread = useTerminalStore((s) => s.incrementUnread)
  const activeSessionId = useTerminalStore((s) => s.activeSessionId)
  const activeSessionIdRef = useRef(activeSessionId)
  activeSessionIdRef.current = activeSessionId

  // Inline async IIFE with mounted flag — avoids race condition where
  // useCallback deps trigger a re-render before the JWT resolves, causing
  // the first connect to fire with a stale/empty token ("Token inválido" flash).
  useEffect(() => {
    let mounted = true

    ;(async () => {
      const jwt = await getFreshJwt()
      if (!mounted) return

      if (!jwt) {
        terminalRef.current?.writeln(`\r\n\x1b[33m[ Sin sesión activa, recargá la página ]\x1b[0m`)
        updateStatus(sessionId, 'error')
        return
      }

      terminalRef.current?.write('\x1b[36m[ Conectando... ]\x1b[0m\r\n')
      updateStatus(sessionId, 'connecting')

      const term = terminalRef.current
      socketRef.current = connectTerminal({
        jwt,
        clientSlug,
        cols: term?.cols ?? 80,
        rows: term?.rows ?? 24,
        onData(data) {
          if (!mounted) return
          terminalRef.current?.write(data)
          if (activeSessionIdRef.current !== sessionId) {
            incrementUnread(sessionId)
          }
        },
        onReady() {
          if (!mounted) return
          updateStatus(sessionId, 'connected')
        },
        onError(msg) {
          if (!mounted) return
          terminalRef.current?.writeln(`\r\n\x1b[31m[Error: ${msg}]\x1b[0m`)
          updateStatus(sessionId, 'error')
        },
        onClose() {
          if (!mounted) return
          updateStatus(sessionId, 'disconnected')
          terminalRef.current?.writeln('\r\n\x1b[33m[Sesión cerrada]\x1b[0m')
        },
      })
    })()

    return () => {
      mounted = false
      socketRef.current?.close()
      socketRef.current = null
    }
  }, [sessionId, clientSlug]) // eslint-disable-line react-hooks/exhaustive-deps

  const sendData = useCallback((data: string) => {
    socketRef.current?.send(data)
  }, [])

  const resize = useCallback((cols: number, rows: number) => {
    socketRef.current?.resize(cols, rows)
  }, [])

  const reconnect = useCallback(async () => {
    const jwt = await getFreshJwt()
    if (!jwt) return
    socketRef.current?.close()
    const term = terminalRef.current
    socketRef.current = connectTerminal({
      jwt,
      clientSlug,
      cols: term?.cols ?? 80,
      rows: term?.rows ?? 24,
      onData(data) { terminalRef.current?.write(data) },
      onReady() { updateStatus(sessionId, 'connected') },
      onError(msg) {
        terminalRef.current?.writeln(`\r\n\x1b[31m[Error: ${msg}]\x1b[0m`)
        updateStatus(sessionId, 'error')
      },
      onClose() {
        updateStatus(sessionId, 'disconnected')
        terminalRef.current?.writeln('\r\n\x1b[33m[Sesión cerrada]\x1b[0m')
      },
    })
  }, [sessionId, clientSlug, terminalRef, updateStatus])

  return { sendData, resize, reconnect }
}
