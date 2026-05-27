import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Topbar } from '@/components/layout/Topbar'
import { ProjectsPanel } from '@/components/panels/ProjectsPanel'
import type { Project } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function ProyectosPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) {
    redirect('/login')
  }

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[Proyectos] fetch error:', error.message)
  }

  const projects: Project[] = (data ?? []) as Project[]

  return (
    <>
      <Topbar title="Proyectos" />
      <div style={{ padding: '24px 28px', flex: 1 }}>
        <ProjectsPanel initialData={projects} ownerEmail={user.email} />
      </div>
    </>
  )
}
