import { createClient } from '@/lib/supabase/server'
import { Topbar } from '@/components/layout/Topbar'
import { ProjectDetailPanel } from '@/components/panels/ProjectDetailPanel'
import { toSlug } from '@/lib/utils'
import type { Project } from '@/lib/types'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single()

  if (error || !data) {
    notFound()
  }

  const project = data as Project

  return (
    <>
      <Topbar
        title={project.name}
        breadcrumb={[
          { label: 'Clientes', href: '/dashboard/clientes' },
          {
            label: project.client_name,
            href: `/dashboard/clientes/${toSlug(project.client_name)}`,
          },
        ]}
      />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <ProjectDetailPanel project={project} />
      </div>
    </>
  )
}
