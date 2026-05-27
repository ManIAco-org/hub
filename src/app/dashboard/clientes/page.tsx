import { createClient } from '@/lib/supabase/server'
import { Topbar } from '@/components/layout/Topbar'
import { ClientesPanel } from '@/components/panels/ClientesPanel'
import type { Project } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function ClientesPage() {
  const supabase = await createClient()

  // Auth enforced by proxy — no redirect here

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('[Clientes] fetch error:', error.message)
  }

  const projects: Project[] = (data ?? []) as Project[]

  return (
    <>
      <Topbar title="Clientes" />
      <div style={{ padding: '24px 28px', flex: 1 }}>
        <ClientesPanel projects={projects} />
      </div>
    </>
  )
}
