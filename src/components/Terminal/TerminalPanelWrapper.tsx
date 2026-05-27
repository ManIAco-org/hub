'use client'

import { useTerminalStore } from '@/stores/terminalStore'
import { TerminalPanel } from './TerminalPanel'
import { TerminalChip } from './TerminalChip'

/**
 * Client wrapper included in DashboardLayout (Server Component).
 * Reads Zustand store to decide what to render:
 *   - Panel open + not minimized → full TerminalPanel
 *   - Minimized or closed (but sessions exist) → floating TerminalChip
 *   - No sessions → nothing
 */
export function TerminalPanelWrapper() {
  const isOpen      = useTerminalStore((s) => s.isOpen)
  const isMinimized = useTerminalStore((s) => s.isMinimized)
  const hasSessions = useTerminalStore((s) => s.sessions.length > 0)

  if (!hasSessions) return null

  return (
    <>
      {isOpen && !isMinimized && <TerminalPanel />}
      {(!isOpen || isMinimized) && <TerminalChip />}
    </>
  )
}
