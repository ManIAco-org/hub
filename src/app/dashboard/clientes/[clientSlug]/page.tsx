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

  // Fetch client by slug from clients table
  const { data: clientRow } = await supabase
    .from('clients')
    .select('id, name')
    .eq('slug', clientSlug)
    .single()

  // Fetch projects linked to this client
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('[ClientDetail] fetch error:', error.message)
  }

  const allProjects: Project[] = (data ?? []) as Project[]

  // Match by client_id if available, fallback to slug match on client_name
  const clientProjects = clientRow
    ? allProjects.filter((p) => p.client_id === clientRow.id || toSlug(p.client_name) === clientSlug)
    : allProjects.filter((p) => toSlug(p.client_name) === clientSlug)

  if (!clientRow && clientProjects.length === 0) {
    notFound()
  }

  const clientId   = clientRow?.id ?? clientProjects[0]?.client_id ?? ''
  const clientName = clientRow?.name ?? clientProjects[0]?.client_name ?? clientSlug

  // Get current user for createdBy
  const { data: { user } } = await supabase.auth.getUser()
  const createdBy = user?.email ?? 'franco.sanmartin@maniaco.online'

  return (
    <>
      <Topbar
        title={clientName}
        breadcrumb={[{ label: 'Clientes', href: '/dashboard/clientes' }]}
      />
      <div style={{ padding: '24px 28px', flex: 1 }}>
        <ClientDetailPanel
          clientId={clientId}
          clientName={clientName}
          clientSlug={clientSlug}
          projects={clientProjects}
          createdBy={createdBy}
          ownerEmail={createdBy}
        />
      </div>
    </>
  )
}
