import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await req.json() as { draftIds?: string[]; editedBody?: string }
    const { draftIds } = body
    if (!draftIds || draftIds.length === 0) {
      return NextResponse.json({ error: 'draftIds requerido' }, { status: 400 })
    }

    const now = new Date().toISOString()
    let approved = 0, alreadyApproved = 0, failed = 0

    for (const draftId of draftIds.slice(0, 100)) {
      const { data: existing } = await supabase
        .from('drafts').select('status').eq('id', draftId).maybeSingle()
      if (!existing) { failed++; continue }
      if (existing.status === 'approved') { alreadyApproved++; continue }

      const { error } = await supabase.from('drafts').update({
        status:      'approved',
        approved_by: user.email,
        approved_at: now,
      }).eq('id', draftId)

      if (error) failed++
      else approved++
    }

    return NextResponse.json({ approved, alreadyApproved, failed })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error inesperado'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
