import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Topbar } from '@/components/layout/Topbar'
import { CampaignDetailPanel } from '@/components/panels/CampaignDetailPanel'
import type { Campaign } from '@/lib/types'

export const revalidate = 0

interface Props {
  params: Promise<{ id: string }>
}

export default async function CampaignDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: campaign }, { count }] = await Promise.all([
    supabase.from('campaigns').select('*').eq('id', id).single(),
    supabase.from('campaign_leads').select('lead_global_id', { count: 'exact', head: true }).eq('campaign_id', id),
  ])

  if (!campaign) notFound()

  return (
    <>
      <Topbar
        title={campaign.name}
        breadcrumb={[{ label: 'Campañas', href: '/dashboard/marketing/campaigns' }]}
      />
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
        <CampaignDetailPanel
          campaign={campaign as Campaign}
          initialLeadCount={count ?? 0}
        />
      </div>
    </>
  )
}
