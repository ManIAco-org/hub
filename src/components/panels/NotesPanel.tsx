'use client'

import { useState, useEffect, useTransition } from 'react'
import dynamic from 'next/dynamic'
import { Plus, FileText, Pencil, Trash2, Check, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

// Dynamically import TipTap editor (SSR: false — uses browser APIs)
const NotesEditor = dynamic(
  () => import('./NotesEditor').then((m) => m.NotesEditor),
  {
    ssr: false,
    loading: () => (
      <div style={{ padding: '24px', color: 'var(--t3)', fontSize: 'var(--text-sm)' }}>
        Cargando editor...
      </div>
    ),
  }
)

// Unified note shape for both tables
interface NoteItem {
  id: string
  title: string
  content: string  // HTML string
  updatedAt: string
}

interface Props {
  clientId?: string
  projectId?: string
  createdBy: string
}

export function NotesPanel({ clientId, projectId, createdBy }: Props) {
  const supabase = createClient()
  const [notes, setNotes]               = useState<NoteItem[]>([])
  const [activeId, setActiveId]         = useState<string | null>(null)
  const [loading, setLoading]           = useState(true)
  const [editingTitle, setEditingTitle] = useState<string | null>(null)
  const [titleDraft, setTitleDraft]     = useState('')
  const [, startTransition]             = useTransition()

  const useClientResources = Boolean(clientId)
  const activeNote = notes.find((n) => n.id === activeId) ?? null

  // ── Load notes ───────────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      setLoading(true)

      if (useClientResources) {
        // client_resources table for client notes
        const { data, error } = await supabase
          .from('client_resources')
          .select('id, title, content, updated_at')
          .eq('client_id', clientId as string)
          .eq('kind', 'note')
          .order('created_at', { ascending: true })

        if (error) {
          toast.error('Error cargando notas')
        } else {
          const items: NoteItem[] = (data ?? []).map((r) => ({
            id: r.id,
            title: r.title,
            content: (r.content as { html?: string } | null)?.html ?? '',
            updatedAt: r.updated_at,
          }))
          setNotes(items)
          if (items.length > 0) setActiveId(items[0]?.id ?? null)
        }
      } else if (projectId) {
        // notes table for project notes
        const { data, error } = await supabase
          .from('notes')
          .select('id, title, content_md, updated_at')
          .eq('project_id', projectId)
          .order('created_at', { ascending: true })

        if (error) {
          toast.error('Error cargando notas')
        } else {
          const items: NoteItem[] = (data ?? []).map((r) => ({
            id: r.id,
            title: r.title,
            content: r.content_md ?? '',
            updatedAt: r.updated_at,
          }))
          setNotes(items)
          if (items.length > 0) setActiveId(items[0]?.id ?? null)
        }
      }

      setLoading(false)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, projectId])

  // ── Create note ──────────────────────────────────────────────────────────────
  async function createNote() {
    if (useClientResources) {
      const { data, error } = await supabase
        .from('client_resources')
        .insert({
          title: 'Nueva nota',
          content: { html: '' },
          client_id: clientId as string,
          kind: 'note',
          created_by: createdBy,
        })
        .select('id, title, content, updated_at')
        .single()

      if (error) { toast.error('Error al crear nota'); return }
      const item: NoteItem = {
        id: data.id,
        title: data.title,
        content: (data.content as { html?: string } | null)?.html ?? '',
        updatedAt: data.updated_at,
      }
      setNotes((prev) => [...prev, item])
      setActiveId(item.id)
      setEditingTitle(item.id)
      setTitleDraft(item.title)
    } else {
      const { data, error } = await supabase
        .from('notes')
        .insert({
          title: 'Nueva nota',
          content_md: '',
          project_id: projectId ?? null,
          client_id: null,
          created_by: createdBy,
        })
        .select('id, title, content_md, updated_at')
        .single()

      if (error) { toast.error('Error al crear nota'); return }
      const item: NoteItem = {
        id: data.id,
        title: data.title,
        content: data.content_md ?? '',
        updatedAt: data.updated_at,
      }
      setNotes((prev) => [...prev, item])
      setActiveId(item.id)
      setEditingTitle(item.id)
      setTitleDraft(item.title)
    }
  }

  // ── Rename note ──────────────────────────────────────────────────────────────
  async function commitRename(noteId: string) {
    const newTitle = titleDraft.trim() || 'Sin título'
    setEditingTitle(null)
    setNotes((prev) => prev.map((n) => n.id === noteId ? { ...n, title: newTitle } : n))

    const table = useClientResources ? 'client_resources' : 'notes'
    const { error } = await supabase.from(table).update({ title: newTitle }).eq('id', noteId)
    if (error) toast.error('Error al renombrar nota')
  }

  // ── Delete note ──────────────────────────────────────────────────────────────
  async function deleteNote(noteId: string) {
    if (!confirm('¿Eliminar esta nota?')) return
    setNotes((prev) => {
      const remaining = prev.filter((n) => n.id !== noteId)
      setActiveId(remaining[remaining.length - 1]?.id ?? null)
      return remaining
    })
    const table = useClientResources ? 'client_resources' : 'notes'
    const { error } = await supabase.from(table).delete().eq('id', noteId)
    if (error) toast.error('Error al eliminar nota')
  }

  // ── Autosave content ─────────────────────────────────────────────────────────
  function handleContentChange(html: string) {
    if (!activeId) return
    setNotes((prev) => prev.map((n) => n.id === activeId ? { ...n, content: html } : n))
    startTransition(async () => {
      if (useClientResources) {
        const { error } = await supabase
          .from('client_resources')
          .update({ content: { html } })
          .eq('id', activeId)
        if (error) toast.error('Error al guardar nota')
      } else {
        const { error } = await supabase
          .from('notes')
          .update({ content_md: html })
          .eq('id', activeId)
        if (error) toast.error('Error al guardar nota')
      }
    })
  }

  // ── Loading state ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ padding: '32px', textAlign: 'center', color: 'var(--t3)', fontSize: 'var(--text-sm)' }}>
        Cargando notas...
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Notas {notes.length > 0 && <span style={{ fontWeight: 400, marginLeft: '4px' }}>({notes.length})</span>}
        </p>
        <button
          onClick={createNote}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: 'var(--text-xs)', padding: '5px 10px' }}
        >
          <Plus size={12} />
          Nueva nota
        </button>
      </div>

      {notes.length === 0 ? (
        /* Empty state */
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: '12px', padding: '48px 20px', textAlign: 'center',
          background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '12px',
        }}>
          <FileText size={28} color="var(--t3)" />
          <div>
            <p style={{ fontWeight: 600, color: 'var(--t2)', fontSize: 'var(--text-sm)', marginBottom: '4px' }}>
              No hay notas todavía
            </p>
            <p style={{ color: 'var(--t3)', fontSize: 'var(--text-xs)' }}>
              Creá la primera nota para empezar.
            </p>
          </div>
          <button onClick={createNote} className="btn-primary" style={{ fontSize: 'var(--text-xs)', padding: '7px 16px' }}>
            <Plus size={12} style={{ display: 'inline', marginRight: '5px' }} />
            Crear primera nota
          </button>
        </div>
      ) : (
        <>
          {/* Compact note list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {notes.map((note) => {
              const isActive  = note.id === activeId
              const isEditing = editingTitle === note.id
              return (
                <div
                  key={note.id}
                  onClick={() => !isEditing && setActiveId(note.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    cursor: isEditing ? 'default' : 'pointer',
                    background: isActive ? 'var(--acc-d)' : 'var(--s2)',
                    border: `1px solid ${isActive ? 'var(--acc)' : 'var(--border)'}`,
                    transition: 'border-color 120ms, background 120ms',
                    boxShadow: isActive ? '0 0 0 1px var(--acc)' : 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.borderColor = 'var(--acc)'
                      e.currentTarget.style.boxShadow   = '0 0 0 1px var(--acc-b)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.borderColor = 'var(--border)'
                      e.currentTarget.style.boxShadow   = 'none'
                    }
                  }}
                >
                  <FileText size={13} color={isActive ? 'var(--acc)' : 'var(--t3)'} style={{ flexShrink: 0 }} />

                  {isEditing ? (
                    <>
                      <input
                        autoFocus
                        value={titleDraft}
                        onChange={(e) => setTitleDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') void commitRename(note.id)
                          if (e.key === 'Escape') setEditingTitle(null)
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="input"
                        style={{ flex: 1, padding: '2px 6px', fontSize: 'var(--text-sm)', height: '24px' }}
                      />
                      <button
                        onClick={(e) => { e.stopPropagation(); void commitRename(note.id) }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: 'var(--ok)', display: 'flex' }}
                      ><Check size={13} /></button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingTitle(null) }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: 'var(--t3)', display: 'flex' }}
                      ><X size={13} /></button>
                    </>
                  ) : (
                    <>
                      <span style={{ flex: 1, fontSize: 'var(--text-sm)', fontWeight: isActive ? 600 : 400, color: isActive ? 'var(--acc)' : 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {note.title}
                      </span>
                      <span style={{ fontSize: '10px', color: 'var(--t3)', fontFamily: 'var(--mono)', flexShrink: 0 }}>
                        {new Date(note.updatedAt).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingTitle(note.id); setTitleDraft(note.title) }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: 'var(--t3)', display: 'flex', opacity: 0 }}
                        className="note-action-btn"
                        title="Renombrar"
                      ><Pencil size={11} /></button>
                      <button
                        onClick={(e) => { e.stopPropagation(); void deleteNote(note.id) }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: 'var(--t3)', display: 'flex', opacity: 0 }}
                        className="note-action-btn"
                        title="Eliminar"
                      ><Trash2 size={11} /></button>
                    </>
                  )}
                </div>
              )
            })}
          </div>

          {/* TipTap editor for active note */}
          {activeNote && (
            <NotesEditor
              key={activeNote.id}
              content={activeNote.content}
              onChange={handleContentChange}
            />
          )}
        </>
      )}
    </div>
  )
}
