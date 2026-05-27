'use client'

import { useTerminalStore } from '@/stores/terminalStore'

export function TerminalChip() {
  const sessions = useTerminalStore((s) => s.sessions)
  const activeSessionId = useTerminalStore((s) => s.activeSessionId)
  const setMinimized = useTerminalStore((s) => s.setMinimized)
  const setOpen = useTerminalStore((s) => s.setOpen)

  const active = sessions.find((s) => s.id === activeSessionId) ?? sessions[0]
  const totalUnread = sessions.reduce((sum, s) => sum + s.unread, 0)

  if (!active) return null

  const isConnected = active.status === 'connected'

  return (
    <button
      onClick={() => { setOpen(true); setMinimized(false) }}
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
      <span style={{ color: '#EFEFEF', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {active.label}
      </span>

      {/* separator */}
      <span style={{ color: '#374151' }}>·</span>

      {/* status */}
      <span style={{ color: isConnected ? '#A3E635' : '#F59E0B', fontSize: '11px' }}>
        {isConnected ? 'activo' : active.status === 'error' ? 'error' : 'conectando'}
      </span>

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
