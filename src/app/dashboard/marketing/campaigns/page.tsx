import { createClient } from '@/lib/supabase/server'
import { Topbar } from '@/components/layout/Topbar'
import { CampaignsPanel } from '@/components/panels/CampaignsPanel'
import type { Campaign } from '@/lib/types'

export const revalidate = 0

export default async function CampaignsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .order('updated_at', { ascending: false })

  if (error) console.error('[Campaigns] fetch error:', error.message)

  const campaigns: Campaign[] = (data ?? []) as Campaign[]

  return (
    <>
      <Topbar title="Campañas" breadcrumb={[{ label: 'Marketing', href: '/dashboard/marketing/campaigns' }]} />
      <div style={{ padding: '24px 28px', flex: 1 }}>
        <CampaignsPanel campaigns={campaigns} ownerEmail={user?.email ?? ''} />
      </div>
    </>
  )
}
