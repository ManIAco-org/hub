import { createClient } from '@/lib/supabase/server'
import { Topbar } from '@/components/layout/Topbar'
import { MarketingOverview } from '@/components/panels/MarketingOverview'
import type { Campaign } from '@/lib/types'

export const revalidate = 60

export default async function MarketingOverviewPage() {
  const supabase = await createClient()

  const [
    { data: campaigns },
    { count: totalLeads },
    { count: enrichedLeads },
    { count: approvedLeads },
    { count: sentLeads },
    { count: repliedLeads },
  ] = await Promise.all([
    supabase.from('campaigns').select('*').order('created_at', { ascending: false }),
    supabase.from('campaign_leads').select('*', { count: 'exact', head: true }),
    supabase.from('campaign_leads').select('*', { count: 'exact', head: true }).eq('status', 'enriched'),
    supabase.from('campaign_leads').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
    supabase.from('campaign_leads').select('*', { count: 'exact', head: true }).eq('status', 'sent'),
    supabase.from('campaign_leads').select('*', { count: 'exact', head: true }).eq('status', 'replied'),
  ])

  // Score distribution
  const { data: scoreData } = await supabase
    .from('leads_global')
    .select('fit_score')
    .not('fit_score', 'is', null)
  const highScore = scoreData?.filter((r) => (r.fit_score ?? 0) >= 6).length ?? 0

  const kpis = {
    total:    totalLeads    ?? 0,
    enriched: enrichedLeads ?? 0,
    approved: approvedLeads ?? 0,
    sent:     sentLeads     ?? 0,
    replied:  repliedLeads  ?? 0,
    highScore,
  }

  return (
    <>
      <Topbar title="Marketing" breadcrumb={[{ label: 'Overview', href: '/dashboard/marketing/overview' }]} />
      <div style={{ padding: '24px 28px', flex: 1, overflowY: 'auto' }}>
        <MarketingOverview campaigns={(campaigns ?? []) as Campaign[]} kpis={kpis} />
      </div>
    </>
  )
}
