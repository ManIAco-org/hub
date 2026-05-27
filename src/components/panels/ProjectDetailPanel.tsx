'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard, ListTodo, FileCode2, Terminal, Rocket,
  FileText, Cpu, Settings, ExternalLink, Github, Save, Plus, Trash2,
} from 'lucide-react'
import type { Project } from '@/lib/types'
import { useTerminalStore } from '@/stores/terminalStore'

type Tab = 'resumen' | 'tareas' | 'archivos' | 'notas' | 'deploys' | 'mcp' | 'terminal' | 'settings'

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'resumen',   label: 'Resumen',     icon: <LayoutDashboard size={14} /> },
  { id: 'tareas',    label: 'Tareas',      icon: <ListTodo size={14} /> },
  { id: 'archivos',  label: 'Archivos',    icon: <FileCode2 size={14} /> },
  { id: 'notas',     label: 'Notas',       icon: <FileText size={14} /> },
  { id: 'deploys',   label: 'Deploys',     icon: <Rocket size={14} /> },
  { id: 'mcp',       label: 'MCP & Tokens',icon: <Cpu size={14} /> },
  { id: 'terminal',  label: 'Terminal',    icon: <Terminal size={14} /> },
  { id: 'settings',  label: 'Settings',    icon: <Settings size={14} /> },
]

const STATUS_LABELS = {
  active: { label: 'Activo',  className: 'badge badge-acc' },
  paused: { label: 'Pausado', className: 'badge badge-warn' },
  done:   { label: 'Listo',   className: 'badge badge-ok' },
}

// ─── Tab: Resumen ────────────────────────────────────────────────────────────
function TabResumen({ project }: { project: Project }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Meta row */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px',
      }}>
        {[
          { label: 'Cliente', value: project.client_name },
          { label: 'Estado', value: <span className={STATUS_LABELS[project.status].className}>{STATUS_LABELS[project.status].label}</span> },
          { label: 'Creado', value: new Date(project.created_at).toLocaleDateString('es-AR') },
          { label: 'Actualizado', value: new Date(project.updated_at).toLocaleDateString('es-AR') },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: 'var(--r8)', padding: '14px' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>{label}</p>
            <div style={{ fontSize: 'var(--text-base)', color: 'var(--t1)' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Description */}
      {project.description && (
        <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: 'var(--r8)', padding: '16px' }}>
          <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Descripción</p>
          <p style={{ fontSize: 'var(--text-base)', color: 'var(--t2)', lineHeight: 1.6 }}>{project.description}</p>
        </div>
      )}

      {/* Links */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        {project.vercel_url && (
          <a href={project.vercel_url} target="_blank" rel="noopener noreferrer"
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--text-sm)', textDecoration: 'none' }}>
            <ExternalLink size={14} />
            Ver en Vercel
          </a>
        )}
        {project.github_url && (
          <a href={project.github_url} target="_blank" rel="noopener noreferrer"
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--text-sm)', textDecoration: 'none' }}>
            <Github size={14} />
            GitHub
          </a>
        )}
        {project.server_path && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: 'var(--r6)', fontSize: 'var(--text-sm)', color: 'var(--t2)' }}>
            <Terminal size={14} color="var(--t3)" />
            <code style={{ fontFamily: 'var(--mono)', fontSize: '12px' }}>{project.server_path}</code>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Tab: Placeholder ────────────────────────────────────────────────────────
function TabPlaceholder({ label, icon, note }: { label: string; icon: React.ReactNode; note: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', gap: '12px', textAlign: 'center' }}>
      <div style={{ color: 'var(--t3)' }}>{icon}</div>
      <p style={{ fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--t2)' }}>{label}</p>
      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--t3)', maxWidth: '360px' }}>{note}</p>
    </div>
  )
}

// ─── Tab: Notas ──────────────────────────────────────────────────────────────
function TabNotas({ project }: { project: Project }) {
  const supabase = createClient()
  const [notes, setNotes] = useState(project.notes_md ?? '')
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    startTransition(async () => {
      const { error } = await supabase.from('projects').update({ notes_md: notes }).eq('id', project.id)
      if (error) { toast.error('Error al guardar notas') } else { toast.success('Notas guardadas') }
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--t3)' }}>
          Markdown · se guarda en la DB
        </p>
        <button
          onClick={handleSave}
          disabled={isPending}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--text-sm)', padding: '6px 14px', opacity: isPending ? 0.7 : 1 }}
        >
          <Save size={13} />
          {saved ? '¡Guardado!' : isPending ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className="input"
        style={{
          minHeight: '400px',
          fontFamily: 'var(--mono)',
          fontSize: '13px',
          lineHeight: 1.6,
          resize: 'vertical',
          whiteSpace: 'pre',
        }}
        placeholder="# Notas del proyecto&#10;&#10;Escribí acá..."
      />
    </div>
  )
}

// ─── Tab: MCP & Tokens ───────────────────────────────────────────────────────
type McpEntry = { name: string; value: string }

const MCP_PRESETS = ['supabase_url', 'supabase_anon_key', 'vercel_token', 'github_token', 'anthropic_api_key', 'custom']

function TabMcp({ project }: { project: Project }) {
  const supabase = createClient()
  const [entries, setEntries] = useState<McpEntry[]>([{ name: '', value: '' }])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [, startTransition] = useTransition()

  function addRow() {
    setEntries((e) => [...e, { name: '', value: '' }])
  }

  function removeRow(i: number) {
    setEntries((e) => e.filter((_, idx) => idx !== i))
  }

  function updateRow(i: number, field: keyof McpEntry, val: string) {
    setEntries((e) => e.map((row, idx) => idx === i ? { ...row, [field]: val } : row))
  }

  function handleSave() {
    setSaving(true)
    startTransition(async () => {
      const valid = entries.filter((e) => e.name.trim() && e.value.trim())
      for (const entry of valid) {
        await supabase
          .from('project_mcp_config')
          .upsert(
            { project_id: project.id, mcp_name: entry.name.trim(), config: { value: entry.value.trim() } },
            { onConflict: 'project_id,mcp_name' }
          )
      }
      setSaving(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{
        padding: '12px 16px', background: 'var(--acc-d)', border: '1px solid var(--acc-b)',
        borderRadius: 'var(--r8)', fontSize: 'var(--text-sm)', color: 'var(--t2)',
      }}>
        <strong style={{ color: 'var(--acc)' }}>Sprint 2:</strong> Estos tokens se inyectarán como env vars en la terminal del proyecto cuando esté disponible.
        Requiere aplicar migración <code style={{ fontFamily: 'var(--mono)', fontSize: '11px' }}>20260527000004</code>.
      </div>

      <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: 'var(--r12)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--t1)' }}>Tokens y variables</h4>
          <button onClick={addRow} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: 'var(--text-xs)', padding: '4px 10px' }}>
            <Plus size={12} />Agregar
          </button>
        </div>

        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {entries.map((entry, i) => (
            <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <select
                value={entry.name}
                onChange={(e) => updateRow(i, 'name', e.target.value)}
                className="input"
                style={{ width: '200px', height: '36px', fontSize: 'var(--text-xs)' }}
              >
                <option value="">Seleccionar...</option>
                {MCP_PRESETS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <input
                type="password"
                value={entry.value}
                onChange={(e) => updateRow(i, 'value', e.target.value)}
                placeholder="valor"
                className="input"
                style={{ flex: 1, height: '36px', fontFamily: 'var(--mono)', fontSize: '12px' }}
              />
              <button
                onClick={() => removeRow(i)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t3)', padding: '4px', display: 'flex' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--err)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--t3)')}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--text-sm)', opacity: saving ? 0.7 : 1 }}
          >
            <Save size={13} />
            {saved ? '¡Guardado!' : saving ? 'Guardando...' : 'Guardar tokens'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Tab: Terminal ────────────────────────────────────────────────────────────
function TabTerminal({ project }: { project: Project }) {
  const sessions    = useTerminalStore((s) => s.sessions)

  // server_path → derive clientSlug: /srv/maniacos/rc-repuestos → "rc-repuestos"
  // If no server_path, derive from project name as fallback
  const clientSlug: string = project.server_path
    ? project.server_path.replace('/srv/maniacos/', '').split('/')[0] ?? project.name.toLowerCase().replace(/[^a-z0-9-]/g, '-')
    : project.name.toLowerCase().replace(/[^a-z0-9-]/g, '-')
  const sessionId  = `project-${project.id}`
  const isOpen     = sessions.some((s) => s.id === sessionId)

  const openStore = useTerminalStore((s) => s.openSession)
  const setOpen   = useTerminalStore((s) => s.setOpen)
  const setMin    = useTerminalStore((s) => s.setMinimized)

  function handleOpen() {
    if (isOpen) { setOpen(true); setMin(false); return }
    openStore({
      id: sessionId,
      clientSlug,
      projectId: project.id,
      label: project.name,
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 20px', gap: '24px', textAlign: 'center' }}>
      {/* Icon */}
      <div style={{
        width: '64px', height: '64px', borderRadius: '18px',
        background: 'var(--acc-d)', border: '1px solid var(--acc-b)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Terminal size={28} color="var(--acc)" />
      </div>

      {/* Heading */}
      <div style={{ maxWidth: '420px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--t1)', margin: 0 }}>
          Terminal
        </h3>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--t3)', lineHeight: 1.6, margin: 0 }}>
          Abrí Claude Code conectado al repo del cliente con MCPs configurados.
          {project.server_path && (
            <> Directorio:{' '}
              <code style={{ fontFamily: 'var(--mono)', color: 'var(--t2)', fontSize: '11px' }}>
                {project.server_path}
              </code>
            </>
          )}
        </p>
      </div>

      {/* CTA */}
      <button
        onClick={handleOpen}
        className="btn-primary"
        style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: 'var(--text-base)', padding: '13px 28px' }}
      >
        <Terminal size={17} />
        {isOpen ? '↓ Ir a terminal' : '💻 Trabajar'}
      </button>

      {isOpen && (
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--acc)' }}>
          Terminal abierta — click para enfocar
        </span>
      )}
    </div>
  )
}

// ─── Tab: Settings ───────────────────────────────────────────────────────────
function TabSettings({ project }: { project: Project }) {
  const router = useRouter()
  const supabase = createClient()
  const [form, setForm] = useState({
    name: project.name,
    description: project.description ?? '',
    vercel_url: project.vercel_url ?? '',
    github_url: project.github_url ?? '',
    server_path: project.server_path ?? '',
    status: project.status,
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [, startTransition] = useTransition()

  function handleSave() {
    setSaving(true)
    startTransition(async () => {
      const { error } = await supabase
        .from('projects')
        .update({
          name: form.name.trim(),
          description: form.description.trim() || null,
          vercel_url: form.vercel_url.trim() || null,
          github_url: form.github_url.trim() || null,
          server_path: form.server_path.trim() || null,
          status: form.status,
        })
        .eq('id', project.id)
      setSaving(false)
      if (error) { toast.error('Error al guardar') } else { toast.success('Proyecto actualizado') }
      setSaved(true)
      setTimeout(() => { setSaved(false); router.refresh() }, 1500)
    })
  }

  const fields: { key: keyof typeof form; label: string; placeholder: string; type?: string }[] = [
    { key: 'name',        label: 'Nombre',         placeholder: 'RC Repuestos' },
    { key: 'description', label: 'Descripción',     placeholder: 'Breve descripción' },
    { key: 'vercel_url',  label: 'URL Vercel',      placeholder: 'https://...', type: 'url' },
    { key: 'github_url',  label: 'URL GitHub',      placeholder: 'https://github.com/...', type: 'url' },
    { key: 'server_path', label: 'Ruta en Oracle',  placeholder: '/srv/maniacos/rc-repuestos' },
  ]

  return (
    <div style={{ maxWidth: '560px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {fields.map(({ key, label, placeholder, type }) => (
        <div key={key}>
          <label style={{ fontSize: 'var(--text-xs)', fontWeight: 500, color: 'var(--t2)', display: 'block', marginBottom: '4px' }}>
            {label}
          </label>
          <input
            type={type ?? 'text'}
            value={form[key]}
            onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
            placeholder={placeholder}
            className="input"
          />
        </div>
      ))}

      <div>
        <label style={{ fontSize: 'var(--text-xs)', fontWeight: 500, color: 'var(--t2)', display: 'block', marginBottom: '4px' }}>
          Estado
        </label>
        <select
          value={form.status}
          onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as typeof form.status }))}
          className="input"
          style={{ height: '38px' }}
        >
          <option value="active">Activo</option>
          <option value="paused">Pausado</option>
          <option value="done">Listo</option>
        </select>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="btn-primary"
        style={{ display: 'flex', alignItems: 'center', gap: '6px', alignSelf: 'flex-start', opacity: saving ? 0.7 : 1 }}
      >
        <Save size={14} />
        {saved ? '¡Guardado!' : saving ? 'Guardando...' : 'Guardar cambios'}
      </button>
    </div>
  )
}

// ─── Main Panel ──────────────────────────────────────────────────────────────
export function ProjectDetailPanel({ project }: { project: Project }) {
  const [activeTab, setActiveTab] = useState<Tab>('resumen')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      {/* Tab bar */}
      <div
        style={{
          display: 'flex',
          gap: '2px',
          padding: '0 28px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--s1)',
          overflowX: 'auto',
        }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '12px 14px',
                fontSize: 'var(--text-sm)',
                fontWeight: isActive ? 600 : 400,
                color: isActive ? 'var(--acc)' : 'var(--t3)',
                background: 'none',
                border: 'none',
                borderBottom: isActive ? '2px solid var(--acc)' : '2px solid transparent',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'color 120ms',
              }}
              onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = 'var(--t2)' }}
              onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = 'var(--t3)' }}
            >
              {tab.icon}
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <div style={{ padding: '24px 28px', flex: 1, overflowY: 'auto' }}>
        {activeTab === 'resumen'   && <TabResumen project={project} />}
        {activeTab === 'notas'     && <TabNotas project={project} />}
        {activeTab === 'mcp'       && <TabMcp project={project} />}
        {activeTab === 'terminal'  && <TabTerminal project={project} />}
        {activeTab === 'settings'  && <TabSettings project={project} />}
        {activeTab === 'tareas' && (
          <TabPlaceholder
            label="Kanban de tareas"
            icon={<ListTodo size={36} />}
            note="Kanban con drag & drop disponible en Sprint 2. Por ahora usá Notion o Linear para las tareas."
          />
        )}
        {activeTab === 'archivos' && (
          <TabPlaceholder
            label="File Explorer"
            icon={<FileCode2 size={36} />}
            note="Explorador de archivos con Monaco Editor disponible en Sprint 2 junto al terminal embebido."
          />
        )}
        {activeTab === 'deploys' && (
          <TabPlaceholder
            label="Historial de deploys"
            icon={<Rocket size={36} />}
            note="Deploys de Vercel por proyecto disponibles en Sprint 2 vía Vercel API."
          />
        )}
      </div>
    </div>
  )
}
