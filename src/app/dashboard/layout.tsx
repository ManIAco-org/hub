import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'
import { upsertMemberStatus } from '@/lib/supabase/upsert-member'
import type { ReactNode } from 'react'

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) {
    redirect('/login')
  }

  // Ensure team_status row exists for this member (idempotent)
  const memberName = await upsertMemberStatus(user.email)

  // If not a known team member, redirect to login (shouldn't happen with magic link)
  if (!memberName) {
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: 'var(--bg)',
      }}
    >
      <Sidebar userEmail={user.email} memberName={memberName} />

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
