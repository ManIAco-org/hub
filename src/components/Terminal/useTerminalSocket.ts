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

export function useTerminalSocket({ sessionId, clientSlug, terminalRef }: Options) {
  const socketRef = useRef<TerminalSocket | null>(null)
  const updateStatus = useTerminalStore((s) => s.updateStatus)
  const incrementUnread = useTerminalStore((s) => s.incrementUnread)
  const activeSessionId = useTerminalStore((s) => s.activeSessionId)
  const activeSessionIdRef = useRef(activeSessionId)
  activeSessionIdRef.current = activeSessionId

  const connect = useCallback(async () => {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      updateStatus(sessionId, 'error')
      return
    }

    updateStatus(sessionId, 'connecting')
    socketRef.current?.close()

    const term = terminalRef.current
    socketRef.current = connectTerminal({
      jwt: session.access_token,
      clientSlug,
      cols: term?.cols ?? 80,
      rows: term?.rows ?? 24,
      onData(data) {
        terminalRef.current?.write(data)
        // Badge unread on inactive sessions
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
    // Wait a tick so XtermInstance can finish async init before we connect
    const t = setTimeout(() => { connect() }, 200)
    return () => {
      clearTimeout(t)
      socketRef.current?.close()
      socketRef.current = null
    }
  }, [connect])

  return { sendData, resize, reconnect: connect }
}
