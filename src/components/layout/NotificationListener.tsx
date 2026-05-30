'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

interface Props { userEmail: string }

interface JobResult {
  scraped?: number
  enriched?: number
  reused?: number
  error?: string
  campaignId?: string
  query?: string
  location?: string
}

export function NotificationListener({ userEmail }: Props) {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel('agent-jobs-notify')
      .on(
        'postgres_changes',
        {
          event:  'UPDATE',
          schema: 'public',
          table:  'agent_jobs',
        },
        (payload) => {
          const job = payload.new as {
            status: string
            created_by: string
            type: string
            result: JobResult | null
          }

          // Only notify for this user's jobs
          if (job.created_by !== userEmail) return
          if (job.status !== 'done' && job.status !== 'failed') return

          const result = job.result ?? {}
          const campaignId = result.campaignId

          if (job.status === 'done') {
            const parts: string[] = []
            if (result.scraped) parts.push(`${result.scraped} leads nuevos`)
            if (result.reused)  parts.push(`${result.reused} del caché`)
            if (result.enriched) parts.push(`${result.enriched} enriquecidos`)

            const msg = parts.length > 0
              ? `✅ Búsqueda completa: ${parts.join(', ')}`
              : '✅ Búsqueda completada'

            toast.success(msg, {
              duration: 8000,
              action: campaignId ? {
                label: 'Ver leads',
                onClick: () => router.push(`/dashboard/marketing/campaigns/${campaignId}`),
              } : undefined,
            })
          } else {
            toast.error(`❌ Error en búsqueda: ${result.error ?? 'Error desconocido'}`, {
              duration: 10000,
              action: campaignId ? {
                label: 'Ver campaña',
                onClick: () => router.push(`/dashboard/marketing/campaigns/${campaignId}`),
              } : undefined,
            })
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userEmail]) // eslint-disable-line react-hooks/exhaustive-deps

  return null // no UI — toasts only
}
