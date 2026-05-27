'use client'

import { useState } from 'react'
import {
  Shield, Github, Globe, Cpu, Cloud, Zap, ExternalLink, ChevronRight,
} from 'lucide-react'

interface TokenSection {
  id: string
  label: string
  icon: React.ReactNode
  tokens: { key: string; label: string; hint: string }[]
}

const SECTIONS: TokenSection[] = [
  {
    id: 'anthropic',
    label: 'Anthropic',
    icon: <Cpu size={16} />,
    tokens: [
      { key: 'ANTHROPIC_API_KEY', label: 'API Key', hint: 'sk-ant-...' },
      { key: 'ANTHROPIC_ORG_ID',  label: 'Org ID',  hint: 'org-...' },
    ],
  },
  {
    id: 'vercel',
    label: 'Vercel',
    icon: <Zap size={16} />,
    tokens: [
      { key: 'VERCEL_TOKEN',   label: 'Team Token', hint: '...' },
      { key: 'VERCEL_TEAM_ID', label: 'Team ID',    hint: 'team_...' },
    ],
  },
  {
    id: 'github',
    label: 'GitHub',
    icon: <Github size={16} />,
    tokens: [
      { key: 'GITHUB_ORG_PAT', label: 'Org PAT',  hint: 'ghp_...' },
      { key: 'GITHUB_ORG',     label: 'Org Name', hint: 'ManIAco-org' },
    ],
  },
  {
    id: 'cloudflare',
    label: 'Cloudflare',
    icon: <Shield size={16} />,
    tokens: [
      { key: 'CF_API_TOKEN',  label: 'API Token',    hint: '...' },
      { key: 'CF_ACCOUNT_ID', label: 'Account ID',   hint: '...' },
      { key: 'CF_ZONE_ID',    label: 'Zone ID hub',  hint: '...' },
    ],
  },
  {
    id: 'resend',
    label: 'Resend / Email',
    icon: <Globe size={16} />,
    tokens: [
      { key: 'RESEND_API_KEY', label: 'Resend API Key', hint: 're_...' },
      { key: 'SMTP_HOST',      label: 'SMTP Host',      hint: 'smtp.zoho.com' },
    ],
  },
]

const INFRA_SERVICES = [
  { label: 'Supabase',    url: 'https://supabase.com/dashboard/project/teyqamjfsfewusqjcfcy', status: 'ok' },
  { label: 'Vercel Hub',  url: 'https://vercel.com/maniaco/hub',                              status: 'ok' },
  { label: 'GitHub Org',  url: 'https://github.com/ManIAco-org',                              status: 'ok' },
  { label: 'Vaultwarden', url: 'https://vault.maniaco.online',                                status: 'ok' },
]

const PLANNED_SERVICES = [
  { label: 'Langfuse',  subdomain: 'trace.maniaco.online',  desc: 'Cost tracking + observabilidad de agentes' },
  { label: 'LiteLLM',  subdomain: 'llm.maniaco.online',    desc: 'Proxy unificado de LLMs (Claude/GPT/Gemini)' },
  { label: 'MinIO',    subdomain: 'files.maniaco.online',   desc: 'File storage interno (docs, assets, backups)' },
]

export function ConfiguracionPanel() {
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <div style={{ maxWidth: '800px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--t1)', marginBottom: '4px' }}>
          Configuración global
        </h2>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--t2)' }}>
          Tokens institucionales, infra y servicios del equipo. Los secrets se gestionan vía{' '}
          <a href="https://vault.maniaco.online" target="_blank" rel="noopener noreferrer"
            style={{ color: 'var(--acc)', textDecoration: 'none' }}>Vaultwarden</a>.
        </p>
      </div>

      {/* Infra activa */}
      <section>
        <h3 style={{ fontSize: '11px', fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
          Infraestructura activa
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px' }}>
          {INFRA_SERVICES.map((svc) => (
            <a
              key={svc.label}
              href={svc.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 14px', background: 'var(--s2)',
                border: '1px solid var(--border)', borderRadius: 'var(--r8)',
                textDecoration: 'none', transition: 'border-color 120ms',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--acc)')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
            >
              <div>
                <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--t1)' }}>{svc.label}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '3px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--ok)', display: 'inline-block' }} />
                  <span style={{ fontSize: '11px', color: 'var(--t3)' }}>operativo</span>
                </div>
              </div>
              <ExternalLink size={13} color="var(--t3)" />
            </a>
          ))}
        </div>
      </section>

      {/* Tokens institucionales */}
      <section>
        <h3 style={{ fontSize: '11px', fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
          Tokens institucionales
        </h3>
        <div style={{
          background: 'var(--acc-d)', border: '1px solid var(--acc-b)',
          borderRadius: 'var(--r8)', padding: '10px 14px', marginBottom: '14px',
          fontSize: 'var(--text-xs)', color: 'var(--t2)',
        }}>
          <strong style={{ color: 'var(--acc)' }}>Sprint 2:</strong> Lectura directa desde Vaultwarden API.
          Por ahora, estos campos son de referencia — los valores reales viven en Vaultwarden.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {SECTIONS.map((section) => (
            <div
              key={section.id}
              style={{
                background: 'var(--s2)', border: '1px solid var(--border)',
                borderRadius: 'var(--r8)', overflow: 'hidden',
              }}
            >
              <button
                onClick={() => setExpanded(expanded === section.id ? null : section.id)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: 'var(--acc)' }}>{section.icon}</span>
                  <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--t1)' }}>{section.label}</span>
                  <span style={{ fontSize: '11px', color: 'var(--t3)' }}>{section.tokens.length} tokens</span>
                </div>
                <ChevronRight
                  size={14} color="var(--t3)"
                  style={{ transform: expanded === section.id ? 'rotate(90deg)' : 'none', transition: 'transform 150ms' }}
                />
              </button>

              {expanded === section.id && (
                <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid var(--bsub)' }}>
                  {section.tokens.map((token) => (
                    <div key={token.key}>
                      <label style={{ fontSize: '11px', fontWeight: 500, color: 'var(--t3)', display: 'block', marginBottom: '4px', marginTop: '10px', fontFamily: 'var(--mono)' }}>
                        {token.key}
                      </label>
                      <input
                        type="password"
                        placeholder={token.hint}
                        className="input"
                        style={{ fontFamily: 'var(--mono)', fontSize: '12px' }}
                        disabled
                        title="Próximamente — conectar con Vaultwarden API"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Servicios planificados */}
      <section>
        <h3 style={{ fontSize: '11px', fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
          Servicios planificados — Sprint 2
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {PLANNED_SERVICES.map((svc) => (
            <div
              key={svc.label}
              style={{
                display: 'flex', alignItems: 'center', gap: '14px',
                padding: '14px 16px', background: 'var(--s2)',
                border: '1px solid var(--border)', borderRadius: 'var(--r8)',
              }}
            >
              <div style={{
                width: '32px', height: '32px', borderRadius: 'var(--r6)',
                background: 'var(--s3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Cloud size={15} color="var(--t3)" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--t1)' }}>{svc.label}</p>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--t3)', marginTop: '1px' }}>{svc.desc}</p>
              </div>
              <code style={{ fontSize: '11px', color: 'var(--t3)', fontFamily: 'var(--mono)' }}>
                {svc.subdomain}
              </code>
              <span className="badge badge-warn" style={{ fontSize: '10px' }}>Pendiente</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
