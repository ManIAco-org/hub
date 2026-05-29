import { redirect } from 'next/navigation'

// Marketing root → campaigns list
export default function MarketingPage() {
  redirect('/dashboard/marketing/campaigns')
}
