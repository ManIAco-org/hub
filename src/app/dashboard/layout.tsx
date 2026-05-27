import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'
import type { ReactNode } from 'react'

// Display names shown in sidebar footer — full name by email
const DISPLAY_NAMES: Record<string, string> = {
  'franco.sanmartin@maniaco.online': 'Franco San Martín',
  'lucho@maniaco.online': 'Luis Giannasi',
  'noe@maniaco.online': 'Noelia Bottallo',
  'contacto@maniaco.online': 'ManIAcos',
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
    </div>
  )
}
