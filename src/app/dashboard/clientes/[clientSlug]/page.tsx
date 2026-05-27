import { createClient } from '@/lib/supabase/server'
import { Topbar } from '@/components/layout/Topbar'
import { ClientDetailPanel } from '@/components/panels/ClientDetailPanel'
import { toSlug } from '@/lib/utils'
import type { Project } from '@/lib/types'
import { notFound } from 'next/navigation'

export const revalidate = 60

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ clientSlug: string }>
}) {
  const { clientSlug } = await params
  const supabase = await createClient()

  // Fetch all projects and filter by slug match on client_name
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('[ClientDetail] fetch error:', error.message)
  }

  const allProjects: Project[] = (data ?? []) as Project[]

  // Match by derived slug from client_name (no clients table needed)
  const clientProjects = allProjects.filter(
    (p) => toSlug(p.client_name) === clientSlug
  )

  if (clientProjects.length === 0) {
    notFound()
  }

  const clientName = clientProjects[0]!.client_name

  return (
    <>
      <Topbar
        title={clientName}
        breadcrumb={[{ label: 'Clientes', href: '/dashboard/clientes' }]}
      />
      <div style={{ padding: '24px 28px', flex: 1 }}>
        <ClientDetailPanel
          clientName={clientName}
          clientSlug={clientSlug}
          projects={clientProjects}
        />
      </div>
    </>
  )
}
