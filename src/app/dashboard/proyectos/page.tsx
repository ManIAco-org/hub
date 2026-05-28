import { createClient } from '@/lib/supabase/server'
import { Topbar } from '@/components/layout/Topbar'
import { ProjectsPanel } from '@/components/panels/ProjectsPanel'
import type { Project, Client } from '@/lib/types'

export const revalidate = 60

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

  const [projectsResult, clientsResult] = await Promise.all([
    supabase.from('projects').select('*').order('created_at', { ascending: false }),
    supabase.from('clients').select('id, slug, name').order('name', { ascending: true }),
  ])

  if (projectsResult.error) {
    console.error('[Proyectos] fetch error:', projectsResult.error.message)
  }

  const projects: Project[] = (projectsResult.data ?? []) as Project[]
  const clients: Pick<Client, 'id' | 'slug' | 'name'>[] =
    (clientsResult.data ?? []) as Pick<Client, 'id' | 'slug' | 'name'>[]

  const { cliente } = await searchParams

  return (
    <>
      <Topbar title="Proyectos" />
      <div style={{ padding: '24px 28px', flex: 1 }}>
        <ProjectsPanel
          initialData={projects}
          ownerEmail={user?.email ?? ''}
          filterCliente={cliente}
          clients={clients}
        />
      </div>
    </>
  )
}
