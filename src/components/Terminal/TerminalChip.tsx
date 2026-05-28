'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useTerminalStore } from '@/stores/terminalStore'

export function TerminalChip() {
  const router    = useRouter()
  const pathname  = usePathname()
  const sessions        = useTerminalStore((s) => s.sessions)
  const activeSessionId = useTerminalStore((s) => s.activeSessionId)
  const setMinimized    = useTerminalStore((s) => s.setMinimized)
  const setOpen         = useTerminalStore((s) => s.setOpen)

  const active = sessions.find((s) => s.id === activeSessionId) ?? sessions[0]
  const totalUnread = sessions.reduce((sum, s) => sum + s.unread, 0)

  if (!active) return null

  const isConnected = active.status === 'connected'

  if (!active) return null

  // If this is a project session and we're not on its route, clicking navigates there.
  // The TerminalPanel then auto-un-minimizes because the session becomes visible.
  const isProjectSession = Boolean(active.projectId)
  const onCorrectRoute   = isProjectSession && typeof active.projectId === 'string'
    ? pathname.includes(active.projectId)
    : true

  function handleClick() {
    if (isProjectSession && !onCorrectRoute && typeof active?.projectId === 'string') {
      // Navigate to the project page — TerminalPanel will unmute the panel on arrival
      router.push(`/dashboard/proyectos/${active.projectId}`)
      setMinimized(false)
    } else {
      setOpen(true)
      setMinimized(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 60,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '9px 16px',
        background: '#111111',
        border: '1px solid #1C1C1C',
        borderRadius: '10px',
        cursor: 'pointer',
        fontFamily: 'var(--mono)',
        fontSize: '12px',
        color: '#EFEFEF',
        boxShadow: '0 4px 24px rgba(0,0,0,0.6)',
        transition: 'border-color 150ms, box-shadow 150ms',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#06B6D4'
        e.currentTarget.style.boxShadow = '0 4px 24px rgba(6,182,212,0.15)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#1C1C1C'
        e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.6)'
      }}
    >
      {/* emoji */}
      <span style={{ fontSize: '14px' }}>💻</span>

      {/* session label */}
      <span style={{ color: '#EFEFEF', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {active.label}
      </span>

      {/* separator */}
      <span style={{ color: '#374151' }}>·</span>

      {/* status — or navigation hint when out of scope */}
      {isProjectSession && !onCorrectRoute ? (
        <span style={{ color: '#06B6D4', fontSize: '11px' }}>ir al proyecto →</span>
      ) : (
        <span style={{ color: isConnected ? '#A3E635' : '#F59E0B', fontSize: '11px' }}>
          {isConnected ? 'activo' : active.status === 'error' ? 'error' : 'conectando'}
        </span>
      )}

      {/* unread badge */}
      {totalUnread > 0 && (
        <span
          style={{
            background: '#06B6D4',
            color: '#0A0A0A',
            borderRadius: '9px',
            padding: '0 6px',
            fontSize: '10px',
            fontWeight: 700,
            lineHeight: '16px',
          }}
        >
          {totalUnread}
        </span>
      )}
    </button>
  )
}
