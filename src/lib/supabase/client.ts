import { createBrowserClient } from '@supabase/ssr'

/**
 * Client-side Supabase client (browser).
 * Use in Client Components and event handlers.
 * Never passes service_role key — only anon key.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
