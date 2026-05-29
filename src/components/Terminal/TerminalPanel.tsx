'use client'

import { useRef, useState, useCallback, useEffect, useLayoutEffect } from 'react'
import type { Terminal } from '@xterm/xterm'
import type { FitAddon } from '@xterm/addon-fit'
import { Minus, Maximize2, ChevronDown, X } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useTerminalStore } from '@/stores/terminalStore'
import type { TerminalSession } from '@/stores/terminalStore'
import { XtermInstance } from './XtermInstance'
import { useTerminalSocket } from './useTerminalSocket'

// ── Status bar (32 px, shows cwd / git branch / claude status / last activity) ──
function StatusBar({ session }: { session: TerminalSession }) {
  const [, tick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 15_000)
    return () => clearInterval(t)
  }, [])

  const elapsed = session.lastActivityAt
    ? Math.floor((Date.now() - session.lastActivityAt) / 60_000)
    : null

  const statusColor =
    session.status === 'connected'    ? '#A3E635'
    : session.status === 'connecting' ? '#06B6D4'
    : session.status === 'error'      ? '#EF4444'
    : '#525866'

  const statusLabel =
    session.status === 'connected'    ? '● Claude activo'
    : session.status === 'connecting' ? '● Conectando...'
    : session.status === 'error'      ? '✗ Error'
    : '○ Desconectado'

  return (
    <div
      style={{
        height: '32px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '0 12px',
        background: '#0D0D0D',
        borderTop: '1px solid #1C1C1C',
        flexShrink: 0,
        fontFamily: '"Geist Mono", monospace',
        fontSize: '11px',
        color: '#525866',
        userSelect: 'none',
        overflow: 'hidden',
      }}
    >
      {session.cwd && (
        <span
          title={session.cwd}
          style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '300px' }}
        >
          📁 {session.cwd.split('/').slice(-2).join('/')}
        </span>
      )}
      {session.gitBranch && session.gitBranch !== 'HEAD' && (
        <span style={{ whiteSpace: 'nowrap' }}>🌿 {session.gitBranch}</span>
      )}
      <span style={{ color: statusColor, whiteSpace: 'nowrap' }}>{statusLabel}</span>
      {elapsed !== null && (
        <span style={{ whiteSpace: 'nowrap' }}>
          ⏱ {elapsed === 0 ? 'ahora' : `${elapsed}min`}
        </span>
      )}
    </div>
  )
}

// ── Per-session pane — only ONE is mounted at a time (the active session) ──────
// Unmounting closes the WS; remounting with tmuxSessionName reattaches via targetSession.
function SessionPane({
  sessionId, clientSlug, isActive, resume, tmuxSessionName,
}: {
  sessionId: string
  clientSlug: string
  isActive: boolean
  resume?: boolean
  tmuxSessionName?: string
}) {
  const termRef    = useRef<Terminal | null>(null)
  const fitRef     = useRef<FitAddon | null>(null)
  const [termReady, setTermReady] = useState(false)

  // If we have a known tmux session name → attach to it (targetSession takes priority
  // on the server side). Otherwise: resume=true → attach-or-create, else → fresh session.
  const { sendData, resize } = useTerminalSocket({
    sessionId,
    clientSlug,
    terminalRef: termRef,
    newSession: !resume && !tmuxSessionName,
    targetSession: tmuxSessionName,
  })

  // Re-fit when active (after xterm is ready)
  useEffect(() => {
    if (isActive && termReady) {
      const fit = fitRef.current
      const term = termRef.current
      if (fit && term) {
        try {
          fit.fit()
          resize(term.cols, term.rows)
        } catch { /* ignore */ }
      }
    }
  }, [isActive, termReady, resize])

  return (
    <>
      {/* Loading skeleton — visible until xterm finishes initialising */}
      {isActive && !termReady && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#0A0A0A', zIndex: 1,
        }}>
          <span style={{
            fontFamily: '"Geist Mono", monospace',
            fontSize: '13px',
            color: '#06B6D4',
            opacity: 0.8,
            letterSpacing: '0.03em',
          }}>
            {tmuxSessionName ? 'Reconectando sesión...' : 'Iniciando terminal...'}
          </span>
        </div>
      )}
      <XtermInstance
        onData={sendData}
        terminalRef={termRef}
        fitAddonRef={fitRef}
        visible={isActive}
        onReady={() => setTermReady(true)}
        onResize={resize}
      />
    </>
  )
}

// ── Control button ─────────────────────────────────────────────────────────────
function CtrlBtn({
  children, onClick, title, danger,
}: {
  children: React.ReactNode
  onClick: () => void
  title?: string
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: '26px', height: '26px',
        background: 'none', border: 'none', borderRadius: '4px',
        cursor: 'pointer', color: '#525866',
        transition: 'color 120ms, background 120ms',
        flexShrink: 0,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = danger ? '#EF4444' : '#EFEFEF'
        e.currentTarget.style.background = danger ? '#2A1010' : '#1C1C1C'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = '#525866'
        e.currentTarget.style.background = 'transparent'
      }}
    >
      {children}
    </button>
  )
}

// ── Main Panel ─────────────────────────────────────────────────────────────────
export function TerminalPanel() {
  const sessions        = useTerminalStore((s) => s.sessions)
  const activeId        = useTerminalStore((s) => s.activeSessionId)
  const switchToSession = useTerminalStore((s) => s.switchToSession)
  const setMinimized    = useTerminalStore((s) => s.setMinimized)
  const setOpen         = useTerminalStore((s) => s.setOpen)

  const pathname = usePathname()

  // Personal sessions always visible; project sessions only on their route
  const visibleSessions = sessions.filter(
    (s) => s.clientSlug === '' || (typeof s.projectId === 'string' && pathname.includes(s.projectId))
  )

  // Auto-minimize when no visible sessions for current route
  useEffect(() => {
    if (sessions.length > 0 && visibleSessions.length === 0) {
      setMinimized(true)
    }
  }, [visibleSessions.length, sessions.length, setMinimized])

  // Switch active session to first visible when active is out of scope
  useEffect(() => {
    const first = visibleSessions[0]
    if (first && !visibleSessions.some((s) => s.id === activeId)) {
      switchToSession(first.id)
    }
  }, [visibleSessions, activeId, switchToSession])

  const [heightVh, setHeightVh]       = useState(40)
  const [isFullscreen, setFullscreen] = useState(false)
  // Animate panel open: start at 0, jump to target after first paint
  const [mounted, setMounted]         = useState(false)
  useLayoutEffect(() => {
    const t = setTimeout(() => setMounted(true), 16) // one frame
    return () => clearTimeout(t)
  }, [])

  // ── Drag-to-resize ────────────────────────────────────────────────────────
  const dragging        = useRef(false)
  const dragStartY      = useRef(0)
  const dragStartHeight = useRef(0)

  const onDragStart = useCallback((e: React.MouseEvent) => {
    dragging.current = true
    dragStartY.current = e.clientY
    dragStartHeight.current = heightVh
    e.preventDefault()
  }, [heightVh])

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!dragging.current) return
      const delta = dragStartY.current - e.clientY
      const pct   = (delta / window.innerHeight) * 100
      setHeightVh((h) => Math.min(90, Math.max(20, dragStartHeight.current + pct)))
    }
    function onUp() { dragging.current = false }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
  }, [])

  const activeSession = sessions.find((s) => s.id === activeId)

  if (sessions.length === 0) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 'var(--sidebar-w, 192px)',
        right: 0,
        height: isFullscreen ? '100vh' : `${heightVh}vh`,
        zIndex: 50,
        background: '#0A0A0A',
        borderTop: '1px solid #1C1C1C',
        borderLeft: '1px solid #1C1C1C',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        // Slide up on first open; smooth fullscreen toggle
        transform: mounted ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 200ms ease, height 150ms ease',
      }}
    >
      {/* ── Drag handle (not in fullscreen) ─────────────────────────────── */}
      {!isFullscreen && (
        <div
          onMouseDown={onDragStart}
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0,
            height: '4px',
            cursor: 'ns-resize',
            zIndex: 10,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#06B6D4')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        />
      )}

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          height: '36px',
          background: '#111111',
          borderBottom: '1px solid #1C1C1C',
          flexShrink: 0,
          userSelect: 'none',
        }}
      >
        {/* Session label */}
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', gap: '10px',
          padding: '0 12px', minWidth: 0, overflow: 'hidden',
        }}>
          <span style={{ fontSize: '13px' }}>💻</span>
          <span style={{
            fontFamily: '"Geist Mono", monospace',
            fontSize: '12px',
            color: '#EFEFEF',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {activeSession?.customName ?? activeSession?.label ?? 'Terminal'}
          </span>
          {visibleSessions.length > 1 && (
            <span style={{ fontSize: '10px', color: '#525866', flexShrink: 0 }}>
              {visibleSessions.length} sesiones
            </span>
          )}
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', padding: '0 6px', flexShrink: 0 }}>
          <CtrlBtn title="Minimizar" onClick={() => setMinimized(true)}>
            <Minus size={13} />
          </CtrlBtn>
          <CtrlBtn
            title={isFullscreen ? 'Restaurar' : 'Pantalla completa'}
            onClick={() => setFullscreen((f) => !f)}
          >
            {isFullscreen ? <ChevronDown size={13} /> : <Maximize2 size={13} />}
          </CtrlBtn>
          <CtrlBtn title="Cerrar panel" onClick={() => setOpen(false)} danger>
            <X size={13} />
          </CtrlBtn>
        </div>
      </div>

      {/* ── Single active terminal pane ───────────────────────────────────── */}
      {/* key=activeSession.id ensures React destroys + recreates the pane on session
          switch, closing the old WS (via useEffect cleanup) and opening a new one
          that reattaches to the right tmux session via targetSession */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', minHeight: 0 }}>
        {activeSession && (
          <SessionPane
            key={activeSession.id}
            sessionId={activeSession.id}
            clientSlug={activeSession.clientSlug}
            isActive={true}
            resume={activeSession.resume}
            tmuxSessionName={activeSession.tmuxSessionName}
          />
        )}
      </div>

      {/* ── Status bar ───────────────────────────────────────────────────── */}
      {activeSession && <StatusBar session={activeSession} />}
    </div>
  )
}
