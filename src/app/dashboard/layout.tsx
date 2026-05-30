import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'
import { TerminalPanelWrapper } from '@/components/Terminal/TerminalPanelWrapper'
import { PresenceTracker } from '@/components/layout/PresenceTracker'
import { NotificationListener } from '@/components/layout/NotificationListener'
import type { ReactNode } from 'react'

// Display names shown in sidebar footer — full name by email
const DISPLAY_NAMES: Record<string, string> = {
  'franco.sanmartin@maniaco.online': 'Franco San Martín',
  'luis.giannasi@maniaco.online':    'Luis Giannasi',
  'noelia.bottallo@maniaco.online':  'Noelia Bottallo',
  'contacto@maniaco.online':         'ManIAcos',
}

function getDisplayName(email: string): string {
  return DISPLAY_NAMES[email] ?? email.split('@')[0] ?? email
}

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Auth enforced by proxy — no redirect here
  const displayName = getDisplayName(user?.email ?? '')

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: 'var(--bg)',
      }}
    >
      <Sidebar userEmail={user?.email ?? ''} memberName={displayName} />

      <main
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'auto',
        }}
      >
        {children}
      </main>

      {/* Terminal panel — client component, persistent across routes */}
      <TerminalPanelWrapper />
      {/* Auto-presence tracker — updates team_status on activity + route change */}
      <PresenceTracker userEmail={user?.email ?? ''} />
      {/* Agent job notifications — shows toasts when background jobs complete */}
      <NotificationListener userEmail={user?.email ?? ''} />
    </div>
  )
}
