'use client'

import { useRef, useState, useCallback, useEffect, useLayoutEffect } from 'react'
import type { Terminal } from '@xterm/xterm'
import type { FitAddon } from '@xterm/addon-fit'
import { Minus, Maximize2, ChevronDown, X } from 'lucide-react'
import { useTerminalStore } from '@/stores/terminalStore'
import { TerminalTab } from './TerminalTab'
import { XtermInstance } from './XtermInstance'
import { useTerminalSocket } from './useTerminalSocket'

// ── Per-session pane (one per session, all mounted, inactive are transparent) ──
function SessionPane({
  sessionId, clientSlug, isActive,
}: {
  sessionId: string
  clientSlug: string
  isActive: boolean
}) {
  const termRef    = useRef<Terminal | null>(null)
  const fitRef     = useRef<FitAddon | null>(null)
  const [termReady, setTermReady] = useState(false)
  const { sendData, resize } = useTerminalSocket({ sessionId, clientSlug, terminalRef: termRef })

  // Re-fit when becoming active (after xterm is ready)
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
            Iniciando terminal...
          </span>
        </div>
      )}
      <XtermInstance
        onData={sendData}
        terminalRef={termRef}
        fitAddonRef={fitRef}
        visible={isActive}
        onReady={() => setTermReady(true)}
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
  const sessions       = useTerminalStore((s) => s.sessions)
  const activeId       = useTerminalStore((s) => s.activeSessionId)
  const switchToSession = useTerminalStore((s) => s.switchToSession)
  const closeSession   = useTerminalStore((s) => s.closeSession)
  const markRead       = useTerminalStore((s) => s.markRead)
  const setMinimized   = useTerminalStore((s) => s.setMinimized)
  const setOpen        = useTerminalStore((s) => s.setOpen)

  const [heightVh, setHeightVh]     = useState(40)
  const [isFullscreen, setFullscreen] = useState(false)
  // Animate panel open: start at 0, jump to target after first paint
  const [mounted, setMounted]       = useState(false)
  useLayoutEffect(() => {
    const t = setTimeout(() => setMounted(true), 16) // one frame
    return () => clearTimeout(t)
  }, [])

  // ── Drag-to-resize ────────────────────────────────────────────────────────
  const dragging       = useRef(false)
  const dragStartY     = useRef(0)
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

  // ── Tab switch ────────────────────────────────────────────────────────────
  const handleSwitch = useCallback((id: string) => {
    switchToSession(id)
    markRead(id)
  }, [switchToSession, markRead])

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
          alignItems: 'stretch',
          height: '36px',
          background: '#111111',
          borderBottom: '1px solid #1C1C1C',
          flexShrink: 0,
          userSelect: 'none',
        }}
      >
        {/* Tabs */}
        <div style={{ display: 'flex', flex: 1, overflowX: 'auto', minWidth: 0 }}>
          {sessions.map((s) => (
            <TerminalTab
              key={s.id}
              session={s}
              isActive={s.id === activeId}
              onClick={() => handleSwitch(s.id)}
              onClose={() => closeSession(s.id)}
            />
          ))}
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

      {/* ── Terminal panes ────────────────────────────────────────────────── */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {sessions.map((s) => (
          <SessionPane
            key={s.id}
            sessionId={s.id}
            clientSlug={s.clientSlug}
            isActive={s.id === activeId}
          />
        ))}
      </div>
    </div>
  )
}
