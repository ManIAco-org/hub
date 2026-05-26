import { redirect } from 'next/navigation'

// Root page redirects to dashboard (Panel 1)
// Auth middleware will redirect to /login if not authenticated
export default function RootPage() {
  redirect('/dashboard')
}
