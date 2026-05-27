import { createClient } from '@/lib/supabase/server'
import { Topbar } from '@/components/layout/Topbar'
import { ProjectsPanel } from '@/components/panels/ProjectsPanel'
import type { Project } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function ProyectosPage({
  searchParams,
}: {
  searchParams: Promise<{ cliente?: string }>
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Auth enforced by proxy — no redirect here

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[Proyectos] fetch error:', error.message)
  }

  const projects: Project[] = (data ?? []) as Project[]
  const { cliente } = await searchParams

  return (
    <>
      <Topbar title="Proyectos" />
      <div style={{ padding: '24px 28px', flex: 1 }}>
        <ProjectsPanel initialData={projects} ownerEmail={user?.email ?? ''} filterCliente={cliente} />
      </div>
    </>
  )
}
