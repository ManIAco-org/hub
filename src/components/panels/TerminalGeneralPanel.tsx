'use client'

import { useEffect } from 'react'
import { useTerminalStore } from '@/stores/terminalStore'

interface Props {
  userEmail: string
  linuxUser: string
}

export function TerminalGeneralPanel({ userEmail: _userEmail, linuxUser }: Props) {
  const openSession  = useTerminalStore((s) => s.openSession)
  const setOpen      = useTerminalStore((s) => s.setOpen)
  const setMinimized = useTerminalStore((s) => s.setMinimized)
  const sessions     = useTerminalStore((s) => s.sessions)

  const sessionId = `personal-${linuxUser}`

  // Auto-open on mount — no button needed
  useEffect(() => {
    const isOpen = sessions.some((s) => s.id === sessionId)
    if (isOpen) {
      setOpen(true)
      setMinimized(false)
    } else {
      openSession({
        id: sessionId,
        clientSlug: '',
        label: `Personal — ${linuxUser}`,
      })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}
