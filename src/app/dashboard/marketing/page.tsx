import { redirect } from 'next/navigation'

// Marketing root → overview
export default function MarketingPage() {
  redirect('/dashboard/marketing/overview')
}
