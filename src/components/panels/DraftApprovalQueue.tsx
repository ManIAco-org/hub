'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import {
  Check, X, Edit3, SkipForward, Globe, Phone,
  CheckSquare, MessageSquare, Mail, ChevronLeft, ChevronRight,
} from 'lucide-react'
import type { EnrichedData } from '@/lib/types'

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

interface DraftRow {
  id: string
  body: string
  subject: string | null
  channel: string
  status: string
  signed_by_email: string
  campaign_id: string
  lead_global_id: string
  created_at: string
  leads_global: {
    id: string; company: string; city: string | null; website: string | null
    phone: string | null; fit_score: number | null; enriched_data: Record<string, unknown> | null
  } | null
}

type Mode = 'card' | 'list'

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────

function signerName(email: string): string {
  const p = email.split('@')[0]?.split('.')[0] ?? ''
  return p.charAt(0).toUpperCase() + p.slice(1)
}

function ScoreBadge({ score }: { score: number | null | undefined }) {
  if (score === null || score === undefined) return null
  const [c, bg] =
    score >= 8 ? ['#22C55E', '#22C55E18'] :
    score >= 5 ? ['#EAB308', '#EAB30818'] :
                 ['#EF4444', '#EF444418']
  return (
    <span style={{ fontSize: '12px', fontWeight: 700, color: c, background: bg, border: `1px solid ${c}30`, borderRadius: '6px', padding: '3px 9px' }}>
      {score}/10
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────

export function DraftApprovalQueue({
  initialDrafts,
  userEmail,
}: {
  initialDrafts: DraftRow[]
  userEmail: string
}) {
  const supabase = createClient()

  // Queue: items are removed when processed
  const [queue, setQueue]         = useState<DraftRow[]>(initialDrafts)
  const [done, setDone]           = useState(0)
  const [mode, setMode]           = useState<Mode>('card')
  const [editBody, setEditBody]   = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [selected, setSelected]   = useState<Set<string>>(new Set())
  const [loading, setLoading]     = useState(false)
  const textareaRef               = useRef<HTMLTextAreaElement>(null)

  const current   = queue[0] ?? null
  const remaining = queue.length
  const total     = done + remaining

  // Sync textarea when draft changes
  useEffect(() => {
    if (current) setEditBody(current.body)
    setIsEditing(false)
  }, [current?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Realtime: new pending drafts append to queue
  useEffect(() => {
    const ch = supabase
      .channel(`daq-${initialDrafts[0]?.campaign_id ?? 'global'}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'drafts' }, (payload) => {
        const d = payload.new as DraftRow
        if (d.status === 'pending') setQueue((prev) => [...prev, d])
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Remove first item from queue (FIFO)
  const pop = useCallback(() => {
    setQueue((prev) => prev.slice(1))
    setDone((n) => n + 1)
  }, [])

  // ── Actions ──────────────────────────────────────────────────────

  const approveCurrent = useCallback(async (bodyOverride?: string) => {
    if (!current || loading) return
    setLoading(true)
    const body       = bodyOverride ?? (isEditing ? editBody : current.body)
    const editedDiff = body !== current.body ? body : null
    const { error } = await supabase.from('drafts').update({
      status:      'approved',
      approved_by: userEmail,
      approved_at: new Date().toISOString(),
      ...(editedDiff ? { body, edited_diff: editedDiff } : {}),
    }).eq('id', current.id)
    setLoading(false)
    if (error) { toast.error('Error al aprobar'); return }
    toast.success(`✓ ${current.leads_global?.company ?? 'Lead'} aprobado`, { duration: 1200 })
    pop()
  }, [current, loading, isEditing, editBody, userEmail, supabase, pop])

  const rejectCurrent = useCallback(async () => {
    if (!current || loading) return
    setLoading(true)
    const { error } = await supabase.from('drafts').update({ status: 'rejected' }).eq('id', current.id)
    setLoading(false)
    if (error) { toast.error('Error al rechazar'); return }
    toast(`✗ ${current.leads_global?.company ?? 'Lead'} rechazado`, { duration: 1200 })
    pop()
  }, [current, loading, supabase, pop])

  const skip = useCallback(() => {
    if (!current) return
    // Move current to end of queue
    setQueue((prev) => [...prev.slice(1), prev[0]!])
  }, [current])

  // ── Keyboard shortcuts ────────────────────────────────────────────
  useEffect(() => {
    if (mode !== 'card') return
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName.toLowerCase()
      if (tag === 'textarea' || tag === 'input') return
      switch (e.key.toLowerCase()) {
        case 'a': e.preventDefault(); void approveCurrent(); break
        case 'r': e.preventDefault(); void rejectCurrent(); break
        case 'e': e.preventDefault(); setIsEditing(true); setTimeout(() => textareaRef.current?.focus(), 50); break
        case 'escape': setIsEditing(false); break
        case ' ':
        case 'arrowright': e.preventDefault(); skip(); break
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [mode, approveCurrent, rejectCurrent, skip])

  // ── Batch approve ─────────────────────────────────────────────────
  async function batchApprove() {
    if (selected.size === 0 || loading) return
    setLoading(true)
    const res = await fetch('/api/drafts/batch-approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ draftIds: Array.from(selected) }),
    })
    const json = await res.json() as { approved?: number; error?: string }
    setLoading(false)
    if (json.error) { toast.error(json.error); return }
    const n = json.approved ?? 0
    toast.success(`${n} draft${n !== 1 ? 's' : ''} aprobados`)
    setQueue((prev) => prev.filter((d) => !selected.has(d.id)))
    setDone((x) => x + n)
    setSelected(new Set())
  }

  // ── Empty state ───────────────────────────────────────────────────
  if (remaining === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px', gap: '14px', textAlign: 'center' }}>
        <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#22C55E18', border: '1px solid #22C55E30', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Check size={24} color="#22C55E" />
        </div>
        <h3 style={{ fontWeight: 700, color: 'var(--t1)', fontSize: 'var(--text-md)', margin: 0 }}>
          {done > 0 ? `${done} draft${done !== 1 ? 's' : ''} procesados` : 'Sin drafts pendientes'}
        </h3>
        <p style={{ color: 'var(--t3)', fontSize: 'var(--text-sm)', maxWidth: '320px', margin: 0 }}>
          {done > 0
            ? 'Cola vacía por ahora. Los nuevos drafts aparecerán automáticamente.'
            : 'Generá drafts desde la pestaña Leads. Volvé aquí para aprobarlos antes de enviar.'}
        </p>
      </div>
    )
  }

  // ── List mode ─────────────────────────────────────────────────────
  if (mode === 'list') {
    const allSelected = selected.size === queue.length && queue.length > 0
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
        {/* List header */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--s1)', position: 'sticky', top: 0, zIndex: 10 }}>
          <button onClick={() => setMode('card')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t3)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: 'var(--text-xs)' }}>
            <ChevronLeft size={15} />Volver
          </button>
          <span style={{ fontWeight: 700, color: 'var(--t1)', fontSize: 'var(--text-sm)' }}>
            {queue.length} pendientes
          </span>
          <div style={{ flex: 1 }} />
          {selected.size > 0 && (
            <button onClick={batchApprove} disabled={loading} className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '6px 14px' }}>
              <Check size={13} />Aprobar {selected.size}
            </button>
          )}
        </div>

        {/* List rows */}
        <div>
          {/* Table header */}
          <div style={{ display: 'grid', gridTemplateColumns: '36px 1fr 2fr 70px 70px', gap: '0', padding: '8px 20px', borderBottom: '1px solid var(--border)', background: 'var(--s3)' }}>
            <input type="checkbox" checked={allSelected} onChange={(e) => setSelected(e.target.checked ? new Set(queue.map(d => d.id)) : new Set())} style={{ accentColor: 'var(--acc)' }} />
            {['Empresa', 'Mensaje', 'Score', 'Canal'].map((h) => (
              <span key={h} style={{ fontSize: '10px', fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</span>
            ))}
          </div>

          {queue.map((d, i) => {
            const lead = d.leads_global
            const checked = selected.has(d.id)
            return (
              <div key={d.id} onClick={() => { setQueue((prev) => [prev[i]!, ...prev.filter((_, j) => j !== i)]); setMode('card') }}
                style={{ display: 'grid', gridTemplateColumns: '36px 1fr 2fr 70px 70px', gap: '0', padding: '12px 20px', borderBottom: '1px solid var(--border)', alignItems: 'center', cursor: 'pointer', background: checked ? 'var(--acc-d)' : 'transparent', transition: 'background 80ms' }}
                onMouseEnter={(e) => { if (!checked) e.currentTarget.style.background = 'var(--s2)' }}
                onMouseLeave={(e) => { if (!checked) e.currentTarget.style.background = 'transparent' }}>
                <div onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={checked} onChange={(e) => { const s = new Set(selected); e.target.checked ? s.add(d.id) : s.delete(d.id); setSelected(s) }} style={{ accentColor: 'var(--acc)' }} />
                </div>
                <div style={{ minWidth: 0, paddingRight: '12px' }}>
                  <p style={{ fontWeight: 600, color: 'var(--t1)', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead?.company ?? '—'}</p>
                  <p style={{ fontSize: '10px', color: 'var(--t3)', marginTop: '2px' }}>{lead?.city ?? ''} · {signerName(d.signed_by_email)}</p>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--t2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '12px' }}>
                  {d.body.slice(0, 90)}{d.body.length > 90 ? '…' : ''}
                </p>
                <ScoreBadge score={lead?.fit_score} />
                <span style={{ fontSize: '11px', color: 'var(--t3)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {d.channel === 'email' ? <Mail size={11} /> : <MessageSquare size={11} />}
                  {d.channel === 'whatsapp' ? 'WA' : 'Email'}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ── Card mode ─────────────────────────────────────────────────────
  if (!current) return null

  const lead    = current.leads_global
  const enriched = lead?.enriched_data as EnrichedData | null
  const isWA    = current.channel !== 'email'
  const chars   = (isEditing ? editBody : current.body).length
  const pct     = total > 0 ? (done / total) * 100 : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>

      {/* ── Top bar ── */}
      <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', background: 'var(--s1)', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
        {/* Progress */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--t1)', fontFamily: 'var(--mono)' }}>
            {remaining}
          </span>
          <span style={{ fontSize: '12px', color: 'var(--t3)' }}>pendientes</span>
          <div style={{ flex: 1, maxWidth: '180px', height: '5px', background: 'var(--s3)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: 'var(--acc)', borderRadius: '3px', transition: 'width 400ms ease' }} />
          </div>
          {done > 0 && <span style={{ fontSize: '11px', color: 'var(--t3)' }}>{done} listos</span>}
        </div>

        {/* Shortcuts hint */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {[['A', 'Aprobar'], ['R', 'Rechazar'], ['E', 'Editar'], ['Esp', 'Saltar']].map(([k, l]) => (
            <span key={k} style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px', color: 'var(--t3)' }}>
              <kbd style={{ background: 'var(--s3)', border: '1px solid var(--border)', borderRadius: '3px', padding: '1px 5px', fontSize: '10px', fontFamily: 'var(--mono)', color: 'var(--t2)' }}>{k}</kbd>
              <span style={{ color: 'var(--t3)' }}>{l}</span>
            </span>
          ))}
        </div>

        <button onClick={() => setMode('list')}
          style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--t3)', background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--r6)', padding: '5px 10px', cursor: 'pointer', flexShrink: 0 }}>
          <CheckSquare size={13} />Ver lista
        </button>
      </div>

      {/* ── Main body ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', flex: 1, minHeight: 0, overflow: 'hidden' }}>

        {/* LEFT: Lead context */}
        <div style={{ borderRight: '1px solid var(--border)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto', background: 'var(--s1)' }}>
          {/* Company */}
          <div>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
              <h3 style={{ fontWeight: 700, color: 'var(--t1)', fontSize: 'var(--text-md)', lineHeight: 1.3, margin: 0 }}>
                {lead?.company ?? '—'}
              </h3>
              <ScoreBadge score={lead?.fit_score} />
            </div>
            {lead?.city && <p style={{ fontSize: '12px', color: 'var(--t3)', margin: 0 }}>{lead.city}</p>}
          </div>

          {/* Contact */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
            {lead?.website && (
              <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--acc)', fontSize: '12px', textDecoration: 'none', wordBreak: 'break-all' }}>
                <Globe size={12} style={{ flexShrink: 0 }} />
                {lead.website.replace(/^https?:\/\//, '').slice(0, 35)}
              </a>
            )}
            {lead?.phone && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--t2)' }}>
                <Phone size={12} color="var(--t3)" />{lead.phone}
              </span>
            )}
          </div>

          {/* Bio / Enrichment */}
          {enriched?.bio && (
            <div style={{ background: 'var(--acc-d)', border: '1px solid var(--acc-b)', borderRadius: 'var(--r8)', padding: '12px' }}>
              <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--acc)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px' }}>Perfil</p>
              <p style={{ fontSize: '12px', color: 'var(--t1)', lineHeight: 1.55, margin: 0 }}>{enriched.bio}</p>
            </div>
          )}
          {enriched?.fit_reason && (
            <p style={{ fontSize: '11px', color: 'var(--t3)', lineHeight: 1.5, margin: 0, borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
              {enriched.fit_reason}
            </p>
          )}

          {/* Meta */}
          <div style={{ marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: 'var(--t3)' }}>
            <span>Canal: {current.channel === 'whatsapp' ? 'WhatsApp' : 'Email'}</span>
            <span>Firmante: {signerName(current.signed_by_email)}</span>
          </div>
        </div>

        {/* RIGHT: Draft + actions */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Draft editor */}
          <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto' }}>
            {/* Channel bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {isWA ? <MessageSquare size={14} color="var(--t3)" /> : <Mail size={14} color="var(--t3)" />}
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--t3)' }}>
                  {isWA ? 'WhatsApp' : 'Email'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {isWA && (
                  <span style={{ fontSize: '12px', fontFamily: 'var(--mono)', color: chars > 280 ? '#EF4444' : chars > 250 ? '#EAB308' : 'var(--t3)' }}>
                    {chars}/300
                  </span>
                )}
                {!isEditing && (
                  <button onClick={() => { setIsEditing(true); setTimeout(() => textareaRef.current?.focus(), 50) }}
                    style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--t3)', background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--r6)', padding: '3px 8px', cursor: 'pointer' }}>
                    <Edit3 size={12} />Editar [E]
                  </button>
                )}
                {isEditing && (
                  <button onClick={() => setIsEditing(false)}
                    style={{ fontSize: '11px', color: 'var(--t3)', background: 'none', border: 'none', cursor: 'pointer' }}>
                    Cancelar [Esc]
                  </button>
                )}
              </div>
            </div>

            {/* Subject (email) */}
            {current.subject && !isEditing && (
              <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--t2)', borderBottom: '1px solid var(--border)', paddingBottom: '10px', margin: 0 }}>
                Asunto: {current.subject}
              </p>
            )}

            {/* Body */}
            <div style={{ flex: 1, background: isEditing ? 'var(--s1)' : 'var(--s2)', border: `1px solid ${isEditing ? 'var(--acc)' : 'var(--border)'}`, borderRadius: 'var(--r8)', padding: '16px', transition: 'border-color 150ms', minHeight: '160px' }}>
              {isEditing ? (
                <textarea
                  ref={textareaRef}
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  style={{ width: '100%', minHeight: '160px', resize: 'vertical', background: 'transparent', border: 'none', outline: 'none', fontSize: '14px', color: 'var(--t1)', lineHeight: 1.7, fontFamily: 'inherit' }}
                />
              ) : (
                <p style={{ fontSize: '14px', color: 'var(--t1)', lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0 }}>
                  {current.body}
                </p>
              )}
            </div>
          </div>

          {/* ── Action bar ── */}
          <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', background: 'var(--s1)', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {isEditing ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button onClick={() => approveCurrent(editBody)} disabled={loading}
                  style={{ padding: '13px', background: '#22C55E', border: 'none', borderRadius: 'var(--r8)', cursor: loading ? 'not-allowed' : 'pointer', color: '#000', fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: loading ? 0.6 : 1 }}>
                  <Check size={16} />Aprobar con cambios
                </button>
                <button onClick={() => setIsEditing(false)}
                  style={{ padding: '13px', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: 'var(--r8)', cursor: 'pointer', color: 'var(--t2)', fontWeight: 600, fontSize: '14px' }}>
                  Descartar cambios
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 0.7fr', gap: '8px' }}>
                <button onClick={() => approveCurrent()} disabled={loading}
                  style={{ padding: '13px', background: '#22C55E', border: 'none', borderRadius: 'var(--r8)', cursor: loading ? 'not-allowed' : 'pointer', color: '#000', fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: loading ? 0.6 : 1, transition: 'opacity 120ms' }}>
                  <Check size={16} />
                  Aprobar
                  <kbd style={{ fontSize: '11px', opacity: 0.6, background: 'rgba(0,0,0,0.2)', borderRadius: '3px', padding: '1px 5px', fontFamily: 'var(--mono)' }}>A</kbd>
                </button>
                <button onClick={() => rejectCurrent()} disabled={loading}
                  style={{ padding: '13px', background: '#EF444415', border: '1px solid #EF444435', borderRadius: 'var(--r8)', cursor: loading ? 'not-allowed' : 'pointer', color: '#EF4444', fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: loading ? 0.6 : 1 }}>
                  <X size={16} />
                  Rechazar
                  <kbd style={{ fontSize: '11px', opacity: 0.6, background: 'rgba(239,68,68,0.1)', borderRadius: '3px', padding: '1px 5px', fontFamily: 'var(--mono)' }}>R</kbd>
                </button>
                <button onClick={skip}
                  style={{ padding: '13px', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: 'var(--r8)', cursor: 'pointer', color: 'var(--t3)', fontWeight: 600, fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <SkipForward size={14} />
                  Saltar
                  <kbd style={{ fontSize: '10px', opacity: 0.5, background: 'var(--s3)', borderRadius: '3px', padding: '1px 4px', fontFamily: 'var(--mono)' }}>Esp</kbd>
                </button>
              </div>
            )}

            {/* Navigation hint */}
            {queue.length > 1 && !isEditing && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                {queue.slice(0, Math.min(5, queue.length)).map((d, i) => (
                  <span key={d.id} onClick={() => { if (i !== 0) { setQueue((prev) => { const next = [...prev]; const [item] = next.splice(i, 1); return [item!, ...next] }) } }}
                    style={{ width: i === 0 ? '20px' : '8px', height: '5px', borderRadius: '3px', background: i === 0 ? 'var(--acc)' : 'var(--border)', cursor: i !== 0 ? 'pointer' : 'default', transition: 'all 200ms', flexShrink: 0 }} />
                ))}
                {queue.length > 5 && <span style={{ fontSize: '10px', color: 'var(--t3)' }}>+{queue.length - 5}</span>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
