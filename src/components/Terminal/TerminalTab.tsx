'use client'

import { X } from 'lucide-react'
import type { TerminalSession } from '@/stores/terminalStore'

interface Props {
  session: TerminalSession
  isActive: boolean
  onClick: () => void
  onClose: () => void
}

const STATUS_DOT: Record<string, string> = {
  connecting:   '#F59E0B',
  connected:    '#A3E635',
  disconnected: '#525866',
  error:        '#EF4444',
}

export function TerminalTab({ session, isActive, onClick, onClose }: Props) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '7px',
        padding: '0 10px 0 12px',
        height: '100%',
        fontSize: '12px',
        fontFamily: 'var(--mono)',
        fontWeight: isActive ? 500 : 400,
        color: isActive ? '#EFEFEF' : '#525866',
        background: isActive ? '#141414' : 'transparent',
        border: 'none',
        borderRight: '1px solid #1C1C1C',
        borderTop: `2px solid ${isActive ? '#06B6D4' : 'transparent'}`,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        flexShrink: 0,
        transition: 'color 120ms',
      }}
      onMouseEnter={(e) => {
        if (!isActive) e.currentTarget.style.color = '#9CA3AF'
      }}
      onMouseLeave={(e) => {
        if (!isActive) e.currentTarget.style.color = '#525866'
      }}
    >
      {/* Status dot */}
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: STATUS_DOT[session.status] ?? '#525866',
          flexShrink: 0,
          transition: 'background 300ms',
        }}
      />

      {/* Label */}
      <span style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {session.label}
      </span>

      {/* Unread badge */}
      {session.unread > 0 && (
        <span
          style={{
            background: '#06B6D4',
            color: '#0A0A0A',
            borderRadius: '9px',
            padding: '0 5px',
            fontSize: '10px',
            fontWeight: 700,
            lineHeight: '16px',
          }}
        >
          {session.unread}
        </span>
      )}

      {/* Close button */}
      <span
        role="button"
        tabIndex={-1}
        aria-label="Cerrar terminal"
        onClick={(e) => { e.stopPropagation(); onClose() }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '16px',
          height: '16px',
          borderRadius: '3px',
          color: '#525866',
          cursor: 'pointer',
          flexShrink: 0,
          transition: 'color 120ms, background 120ms',
        }}
        onMouseEnter={(e) => {
          ;(e.currentTarget as HTMLElement).style.color = '#EF4444'
          ;(e.currentTarget as HTMLElement).style.background = '#2A1010'
        }}
        onMouseLeave={(e) => {
          ;(e.currentTarget as HTMLElement).style.color = '#525866'
          ;(e.currentTarget as HTMLElement).style.background = 'transparent'
        }}
      >
        <X size={11} />
      </span>
    </button>
  )
}
