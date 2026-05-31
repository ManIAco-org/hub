'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Check, X, Edit3, SkipForward, Globe, Phone, ArrowLeft, CheckSquare, MessageSquare, Mail } from 'lucide-react'
import type { EnrichedData } from '@/lib/types'

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

type Mode = 'card' | 'batch'

function signerName(email: string): string {
  const p = email.split('@')[0]?.split('.')[0] ?? ''
  return p.charAt(0).toUpperCase() + p.slice(1)
}

function ScoreBadge({ score }: { score: number | null | undefined }) {
  if (!score && score !== 0) return null
  const [c, bg] = score >= 8 ? ['#22C55E', '#22C55E20'] : score >= 5 ? ['#EAB308', '#EAB30820'] : ['#EF4444', '#EF444420']
  return (
    <span style={{ fontSize: '11px', fontWeight: 700, color: c, background: bg, border: `1px solid ${c}40`, borderRadius: '6px', padding: '2px 8px' }}>
      {score}/10
    </span>
  )
}

export function DraftApprovalQueue({ initialDrafts, userEmail }: {
  initialDrafts: DraftRow[]
  userEmail: string
}) {
  const supabase = createClient()
  const [drafts, setDrafts] = useState<DraftRow[]>(initialDrafts)
  const [idx, setIdx] = useState(0)
  const [mode, setMode] = useState<Mode>('card')
  const [editBody, setEditBody] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [processing, setProcessing] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const current = drafts[idx] ?? null
  const total   = drafts.length
  const done    = idx

  // Sync edit body when draft changes
  useEffect(() => {
    if (current) setEditBody(current.body)
    setIsEditing(false)
  }, [idx, current?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Realtime: pick up new pending drafts
  useEffect(() => {
    const ch = supabase.channel('drafts-queue')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'drafts' }, (payload) => {
        const d = payload.new as DraftRow
        if (d.status === 'pending') setDrafts((prev) => [...prev, d])
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const advance = useCallback(() => {
    setIdx((i) => Math.min(i + 1, drafts.length))
  }, [drafts.length])

  const approveCurrent = useCallback(async (overrideBody?: string) => {
    if (!current || processing) return
    setProcessing(true)
    const body = overrideBody ?? (isEditing ? editBody : current.body)
    const editedDiff = body !== current.body ? body : null
    const { error } = await supabase.from('drafts').update({
      status:      'approved',
      approved_by: userEmail,
      approved_at: new Date().toISOString(),
      ...(editedDiff ? { body, edited_diff: editedDiff } : {}),
    }).eq('id', current.id)
    setProcessing(false)
    if (error) { toast.error('Error al aprobar'); return }
    toast.success(`Aprobado: ${current.leads_global?.company ?? 'lead'}`, { duration: 1500 })
    advance()
  }, [current, processing, isEditing, editBody, userEmail, supabase, advance])

  const rejectCurrent = useCallback(async () => {
    if (!current || processing) return
    setProcessing(true)
    const { error } = await supabase.from('drafts').update({
      status: 'rejected',
    }).eq('id', current.id)
    setProcessing(false)
    if (error) { toast.error('Error al rechazar'); return }
    toast(`Rechazado: ${current.leads_global?.company ?? 'lead'}`, { duration: 1200 })
    advance()
  }, [current, processing, supabase, advance])

  const skipCurrent = useCallback(() => {
    if (!current) return
    advance()
  }, [current, advance])

  // Keyboard shortcuts
  useEffect(() => {
    if (mode !== 'card') return
    function handler(e: KeyboardEvent) {
      if (isEditing && e.key !== 'Escape') return
      switch (e.key.toLowerCase()) {
        case 'a': e.preventDefault(); void approveCurrent(); break
        case 'r': e.preventDefault(); void rejectCurrent(); break
        case 'e': e.preventDefault(); setIsEditing(true); setTimeout(() => textareaRef.current?.focus(), 50); break
        case 'escape': setIsEditing(false); break
        case ' ':
        case 'arrowright': e.preventDefault(); skipCurrent(); break
        case 'arrowleft': e.preventDefault(); setIdx((i) => Math.max(0, i - 1)); break
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [mode, isEditing, approveCurrent, rejectCurrent, skipCurrent])

  async function batchApprove() {
    if (selected.size === 0) return
    setProcessing(true)
    const res = await fetch('/api/drafts/batch-approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ draftIds: Array.from(selected) }),
    })
    const json = await res.json() as { approved?: number; error?: string }
    setProcessing(false)
    if (json.error) { toast.error(json.error); return }
    toast.success(`${json.approved ?? 0} drafts aprobados`)
    setDrafts((prev) => prev.filter((d) => !selected.has(d.id)))
    setSelected(new Set())
    setIdx(0)
  }

  // ── Empty state ──────────────────────────────────────────────────────────────
  if (total === 0 || idx >= total) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '16px', padding: '24px' }}>
        <Check size={40} color="#22C55E" />
        <h2 style={{ fontWeight: 700, color: 'var(--t1)', fontSize: 'var(--text-lg)' }}>Cola vacía</h2>
        <p style={{ color: 'var(--t3)', fontSize: 'var(--text-sm)', textAlign: 'center' }}>
          {idx >= total && total > 0
            ? `Procesaste los ${total} drafts de esta sesión.`
            : 'No hay drafts pendientes de aprobación. Generá drafts desde una campaña.'}
        </p>
        {idx >= total && total > 0 && (
          <button onClick={() => setIdx(0)} className="btn-secondary" style={{ fontSize: 'var(--text-sm)' }}>
            Revisar de nuevo
          </button>
        )}
      </div>
    )
  }

  // ── Batch mode ───────────────────────────────────────────────────────────────
  if (mode === 'batch') {
    const remaining = drafts.slice(idx)
    return (
      <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => setMode('card')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t3)', display: 'flex', padding: '4px' }}>
            <ArrowLeft size={18} />
          </button>
          <h2 style={{ fontWeight: 700, color: 'var(--t1)', fontSize: 'var(--text-md)' }}>Vista tabla</h2>
          <span style={{ fontSize: '11px', color: 'var(--t3)' }}>{remaining.length} pendientes</span>
          <div style={{ flex: 1 }} />
          {selected.size > 0 && (
            <button onClick={batchApprove} disabled={processing} className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--text-sm)' }}>
              <Check size={14} />Aprobar seleccionados ({selected.size})
            </button>
          )}
        </div>

        <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: 'var(--r12)', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '32px 2fr 3fr 80px 80px', padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'var(--s3)' }}>
            <input type="checkbox" checked={selected.size === remaining.length && remaining.length > 0}
              onChange={(e) => setSelected(e.target.checked ? new Set(remaining.map(d => d.id)) : new Set())}
              style={{ accentColor: 'var(--acc)' }} />
            {['Empresa', 'Draft', 'Score', 'Canal'].map(h => (
              <span key={h} style={{ fontSize: '11px', fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</span>
            ))}
          </div>
          <div style={{ maxHeight: '65vh', overflowY: 'auto' }}>
            {remaining.map((d, i) => {
              const lead = d.leads_global
              const isChecked = selected.has(d.id)
              return (
                <div key={d.id} style={{
                  display: 'grid', gridTemplateColumns: '32px 2fr 3fr 80px 80px',
                  padding: '10px 16px', alignItems: 'center',
                  borderBottom: i < remaining.length - 1 ? '1px solid var(--border)' : 'none',
                  background: isChecked ? 'var(--acc-d)' : 'transparent',
                  transition: 'background 80ms',
                }}>
                  <input type="checkbox" checked={isChecked}
                    onChange={(e) => {
                      const s = new Set(selected)
                      e.target.checked ? s.add(d.id) : s.delete(d.id)
                      setSelected(s)
                    }}
                    style={{ accentColor: 'var(--acc)' }} />
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontWeight: 600, color: 'var(--t1)', fontSize: 'var(--text-xs)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {lead?.company ?? '—'}
                    </p>
                    <p style={{ fontSize: '10px', color: 'var(--t3)' }}>{lead?.city ?? ''} · {signerName(d.signed_by_email)}</p>
                  </div>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--t2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '8px' }}>
                    {d.body.slice(0, 100)}{d.body.length > 100 ? '…' : ''}
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
      </div>
    )
  }

  // ── Card mode ────────────────────────────────────────────────────────────────
  if (!current) return null

  const lead = current.leads_global
  const enriched = lead?.enriched_data as EnrichedData | null
  const isWA = current.channel !== 'email'
  const charCount = editBody.length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '24px 28px', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontWeight: 700, color: 'var(--t1)', fontSize: 'var(--text-md)' }}>Cola de aprobación</h2>
          <p style={{ fontSize: '11px', color: 'var(--t3)', marginTop: '2px' }}>
            {idx + 1} / {total} · A=Aprobar · R=Rechazar · E=Editar · Espacio=Saltar
          </p>
        </div>
        {/* Progress bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '120px', height: '4px', background: 'var(--s3)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(done / total) * 100}%`, background: 'var(--acc)', transition: 'width 200ms' }} />
          </div>
          <span style={{ fontSize: '11px', color: 'var(--t3)', fontFamily: 'var(--mono)' }}>
            {Math.round((done / total) * 100)}%
          </span>
        </div>
        <button onClick={() => setMode('batch')}
          style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--t3)', background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--r6)', padding: '5px 10px', cursor: 'pointer' }}>
          <CheckSquare size={13} />Tabla
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: '20px', flex: 1, minHeight: 0 }}>
        {/* Left: Lead context */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflow: 'auto' }}>
          {/* Company header */}
          <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: 'var(--r8)', padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px' }}>
              <h3 style={{ fontWeight: 700, color: 'var(--t1)', fontSize: 'var(--text-md)', lineHeight: 1.3 }}>
                {lead?.company ?? '—'}
              </h3>
              <ScoreBadge score={lead?.fit_score} />
            </div>
            {lead?.city && <p style={{ fontSize: 'var(--text-xs)', color: 'var(--t3)', marginBottom: '8px' }}>{lead.city}</p>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {lead?.website && (
                <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                  target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--acc)', fontSize: 'var(--text-xs)', textDecoration: 'none' }}>
                  <Globe size={11} />{lead.website.replace(/^https?:\/\//, '').slice(0, 40)}
                </a>
              )}
              {lead?.phone && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--t2)', fontSize: 'var(--text-xs)' }}>
                  <Phone size={11} color="var(--t3)" />{lead.phone}
                </span>
              )}
            </div>
          </div>

          {/* Enrichment */}
          {enriched?.bio && (
            <div style={{ background: 'var(--acc-d)', border: '1px solid var(--acc-b)', borderRadius: 'var(--r8)', padding: '12px' }}>
              <p style={{ fontSize: '10px', fontWeight: 600, color: 'var(--acc)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Perfil</p>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--t1)', lineHeight: 1.5 }}>{enriched.bio}</p>
              {enriched.fit_reason && (
                <p style={{ fontSize: '11px', color: 'var(--t3)', marginTop: '6px', lineHeight: 1.4 }}>{enriched.fit_reason}</p>
              )}
            </div>
          )}

          {/* Meta */}
          <div style={{ fontSize: '11px', color: 'var(--t3)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span>Canal: {current.channel === 'whatsapp' ? 'WhatsApp' : 'Email'}</span>
            <span>Firmante: {signerName(current.signed_by_email)}</span>
            <span>Generado: {new Date(current.created_at).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>

        {/* Right: Draft + actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Draft card */}
          <div style={{ background: 'var(--s2)', border: `1px solid ${isEditing ? 'var(--acc)' : 'var(--border)'}`, borderRadius: 'var(--r8)', padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', transition: 'border-color 150ms' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {current.channel === 'email' ? 'Email' : 'WhatsApp'}
              </p>
              {isWA && (
                <span style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: charCount > 280 ? '#EF4444' : charCount > 250 ? '#EAB308' : 'var(--t3)' }}>
                  {charCount}/300
                </span>
              )}
            </div>

            {current.subject && !isEditing && (
              <p style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--t2)', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                Asunto: {current.subject}
              </p>
            )}

            {isEditing ? (
              <textarea
                ref={textareaRef}
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                style={{
                  flex: 1, resize: 'none', background: 'transparent', border: 'none', outline: 'none',
                  fontSize: 'var(--text-sm)', color: 'var(--t1)', lineHeight: 1.7, fontFamily: 'inherit',
                  minHeight: '180px',
                }}
                placeholder="Editá el mensaje..."
              />
            ) : (
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--t1)', lineHeight: 1.7, whiteSpace: 'pre-wrap', flex: 1 }}>
                {current.body}
              </p>
            )}

            {isEditing && (
              <button onClick={() => setIsEditing(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t3)', fontSize: '11px', alignSelf: 'flex-start' }}>
                ← cancelar edición (Esc)
              </button>
            )}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button
              onClick={() => approveCurrent()}
              disabled={processing}
              style={{ padding: '14px', background: '#22C55E', border: 'none', borderRadius: 'var(--r8)', cursor: processing ? 'not-allowed' : 'pointer', color: '#000', fontWeight: 700, fontSize: 'var(--text-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', opacity: processing ? 0.7 : 1, transition: 'opacity 120ms' }}>
              <Check size={16} />Aprobar <span style={{ fontFamily: 'var(--mono)', fontSize: '10px', opacity: 0.7 }}>[A]</span>
            </button>
            <button
              onClick={() => rejectCurrent()}
              disabled={processing}
              style={{ padding: '14px', background: '#EF444420', border: '1px solid #EF444430', borderRadius: 'var(--r8)', cursor: processing ? 'not-allowed' : 'pointer', color: '#EF4444', fontWeight: 700, fontSize: 'var(--text-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', opacity: processing ? 0.7 : 1 }}>
              <X size={16} />Rechazar <span style={{ fontFamily: 'var(--mono)', fontSize: '10px', opacity: 0.7 }}>[R]</span>
            </button>
            <button
              onClick={() => { setIsEditing(true); setTimeout(() => textareaRef.current?.focus(), 50) }}
              style={{ padding: '12px', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: 'var(--r8)', cursor: 'pointer', color: 'var(--t2)', fontWeight: 600, fontSize: 'var(--text-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <Edit3 size={14} />Editar <span style={{ fontFamily: 'var(--mono)', fontSize: '10px', opacity: 0.6 }}>[E]</span>
            </button>
            <button
              onClick={skipCurrent}
              style={{ padding: '12px', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: 'var(--r8)', cursor: 'pointer', color: 'var(--t3)', fontWeight: 600, fontSize: 'var(--text-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <SkipForward size={14} />Saltar <span style={{ fontFamily: 'var(--mono)', fontSize: '10px', opacity: 0.6 }}>[Esp]</span>
            </button>
          </div>

          {isEditing && (
            <button
              onClick={() => approveCurrent(editBody)}
              disabled={processing}
              style={{ padding: '12px', background: '#22C55E20', border: '1px solid #22C55E40', borderRadius: 'var(--r8)', cursor: 'pointer', color: '#22C55E', fontWeight: 700, fontSize: 'var(--text-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <Check size={14} />Aprobar con edición
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
