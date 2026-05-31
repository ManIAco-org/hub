import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DraftApprovalQueue } from '@/components/panels/DraftApprovalQueue'

export default async function ApprovalPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: drafts } = await supabase
    .from('drafts')
    .select(`
      id, body, subject, channel, status, signed_by_email,
      campaign_id, lead_global_id, created_at,
      leads_global ( id, company, city, website, phone, fit_score, enriched_data )
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(200)

  return (
    <DraftApprovalQueue
      initialDrafts={(drafts ?? []) as unknown as Parameters<typeof DraftApprovalQueue>[0]['initialDrafts']}
      userEmail={user.email!}
    />
  )
}
