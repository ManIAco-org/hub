import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Topbar } from '@/components/layout/Topbar'
import { TeamStatusPanel } from '@/components/panels/TeamStatusPanel'
import type { TeamStatus } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) {
    redirect('/login')
  }

  const { data: teamData, error } = await supabase
    .from('team_status')
    .select('*')
    .order('member_name')

  if (error) {
    console.error('[Dashboard] team_status fetch error:', error.message)
  }

  const teamStatus: TeamStatus[] = (teamData ?? []) as TeamStatus[]

  return (
    <>
      <Topbar title="Equipo" />

      <div style={{ padding: '24px 28px', flex: 1 }}>
        <div style={{ marginBottom: '20px' }}>
          <h2
            style={{
              fontSize: 'var(--text-lg)',
              fontWeight: 700,
              color: 'var(--t1)',
              marginBottom: '4px',
            }}
          >
            Estado del equipo
          </h2>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--t2)' }}>
            Actualización en tiempo real · click en tu card para editar
          </p>
        </div>

        <TeamStatusPanel
          initialData={teamStatus}
          currentUserEmail={user.email}
        />
      </div>
    </>
  )
}
