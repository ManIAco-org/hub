import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'
import type { ReactNode } from 'react'
import type { MemberName } from '@/lib/types'

const TEAM_NAMES: Record<string, MemberName> = {
  'franco.sanmartin@maniaco.online': 'Franco',
  'lucho@maniaco.online': 'Lucho',
  'noe@maniaco.online': 'Noe',
}

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Auth enforced by proxy — no redirect here
  const memberName: MemberName = TEAM_NAMES[user?.email ?? ''] ?? 'Franco'

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: 'var(--bg)',
      }}
    >
      <Sidebar userEmail={user?.email ?? ''} memberName={memberName} />

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
