'use client'

import { CheckCircle2, XCircle, Clock, GitBranch, GitCommit, ExternalLink, Gauge, RefreshCw } from 'lucide-react'

type DeployStatus = 'ready' | 'error' | 'building' | 'canceled'

interface Deploy {
  id: string
  project: string
  branch: string
  commitSha: string
  commitMsg: string
  status: DeployStatus
  duration: number   // seconds
  createdAt: string
  url: string
  lighthouse?: {
    performance: number
    accessibility: number
    seo: number
  }
}

const STATUS_CONFIG: Record<DeployStatus, { label: string; color: string; Icon: typeof CheckCircle2 }> = {
  ready:    { label: 'Ready',     color: 'var(--ok)',   Icon: CheckCircle2 },
  error:    { label: 'Error',     color: 'var(--err)',  Icon: XCircle },
  building: { label: 'Building',  color: 'var(--warn)', Icon: RefreshCw },
  canceled: { label: 'Canceled',  color: 'var(--t3)',   Icon: XCircle },
}

// Mock data — will connect to Vercel API in Sprint 2
const MOCK_DEPLOYS: Deploy[] = [
  {
    id: 'dpl_001',
    project: 'hub',
    branch: 'master',
    commitSha: 'd89d0f0',
    commitMsg: 'fix(deps): align eslint-config-next to 16.2.6',
    status: 'ready',
    duration: 38,
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    url: 'https://hub-maniaco.vercel.app',
    lighthouse: { performance: 94, accessibility: 98, seo: 100 },
  },
  {
    id: 'dpl_002',
    project: 'hub',
    branch: 'master',
    commitSha: '80d541e',
    commitMsg: 'fix(deps): bump Next.js to 16.2.6 + React 19.2.6',
    status: 'error',
    duration: 47,
    createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    url: '',
  },
  {
    id: 'dpl_003',
    project: 'hub',
    branch: 'master',
    commitSha: '1c7552a',
    commitMsg: 'feat: T005+T006+T007 — Layout shell, Team Status, Projects',
    status: 'ready',
    duration: 52,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    url: 'https://hub-maniaco.vercel.app',
    lighthouse: { performance: 91, accessibility: 97, seo: 100 },
  },
  {
    id: 'dpl_004',
    project: 'hub',
    branch: 'master',
    commitSha: 'a53ef77',
    commitMsg: 'feat: T003+T004 — Supabase schema + auth magic link',
    status: 'ready',
    duration: 44,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
    url: '',
    lighthouse: { performance: 89, accessibility: 96, seo: 100 },
  },
  {
    id: 'dpl_005',
    project: 'hub',
    branch: 'master',
    commitSha: 'f4a3815',
    commitMsg: 'feat: T001+T002 — Next.js 15 scaffold + ManIAcos brand',
    status: 'ready',
    duration: 61,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    url: '',
  },
]

function formatDuration(s: number): string {
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m ${s % 60}s`
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'hace un momento'
  if (mins < 60) return `hace ${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs}h`
  return `hace ${Math.floor(hrs / 24)}d`
}

function LighthouseScore({ score }: { score: number }) {
  const color = score >= 90 ? 'var(--ok)' : score >= 70 ? 'var(--warn)' : 'var(--err)'
  return (
    <span
      style={{
        fontSize: '11px',
        fontWeight: 700,
        color,
        fontFamily: 'var(--mono)',
      }}
    >
      {score}
    </span>
  )
}

export function DeploysPanel() {
  const latest = MOCK_DEPLOYS[0]

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--t1)', marginBottom: '2px' }}>
              Deploys
            </h2>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--t2)' }}>
              Historial de deployments · datos reales en Sprint 2
            </p>
          </div>
          <span
            style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--t3)',
              background: 'var(--s2)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r8)',
              padding: '4px 10px',
            }}
          >
            Mock data
          </span>
        </div>
      </div>

      {/* Latest deploy highlight */}
      {latest && (
        <div
          style={{
            background: 'var(--s2)',
            border: '1px solid var(--acc)',
            borderRadius: 'var(--r12)',
            padding: '16px 20px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <CheckCircle2 size={20} color="var(--ok)" />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--t1)', marginBottom: '2px' }}>
              Production · {latest.project}
            </p>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--t3)' }}>
              {formatRelativeTime(latest.createdAt)} · {formatDuration(latest.duration)}
            </p>
          </div>
          {latest.lighthouse && (
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <Gauge size={12} color="var(--t3)" style={{ marginBottom: '2px' }} />
                <LighthouseScore score={latest.lighthouse.performance} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '10px', color: 'var(--t3)' }}>a11y</p>
                <LighthouseScore score={latest.lighthouse.accessibility} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '10px', color: 'var(--t3)' }}>SEO</p>
                <LighthouseScore score={latest.lighthouse.seo} />
              </div>
            </div>
          )}
          {latest.url && (
            <a
              href={latest.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--t3)', display: 'flex', alignItems: 'center' }}
            >
              <ExternalLink size={15} />
            </a>
          )}
        </div>
      )}

      {/* Deploys table */}
      <div
        style={{
          background: 'var(--s2)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r12)',
          overflow: 'hidden',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Estado', 'Proyecto / Rama', 'Commit', 'Duración', 'Lighthouse', 'Hace'].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: '10px 16px',
                    textAlign: 'left',
                    fontSize: 'var(--text-xs)',
                    fontWeight: 600,
                    color: 'var(--t3)',
                    whiteSpace: 'nowrap',
                    background: 'var(--s1)',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MOCK_DEPLOYS.map((deploy, idx) => {
              const cfg = STATUS_CONFIG[deploy.status]
              const isLast = idx === MOCK_DEPLOYS.length - 1
              return (
                <tr
                  key={deploy.id}
                  style={{
                    borderBottom: isLast ? 'none' : '1px solid var(--bsub)',
                    transition: 'background var(--t-fast)',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--s3)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  {/* Status */}
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <cfg.Icon size={14} color={cfg.color} />
                      <span style={{ fontSize: 'var(--text-xs)', color: cfg.color }}>{cfg.label}</span>
                    </div>
                  </td>

                  {/* Project / Branch */}
                  <td style={{ padding: '12px 16px' }}>
                    <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--t1)' }}>
                      {deploy.project}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                      <GitBranch size={11} color="var(--t3)" />
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--t3)' }}>{deploy.branch}</span>
                    </div>
                  </td>

                  {/* Commit */}
                  <td style={{ padding: '12px 16px', maxWidth: '260px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <GitCommit size={11} color="var(--t3)" />
                      <span style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--acc)' }}>
                        {deploy.commitSha}
                      </span>
                    </div>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--t2)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {deploy.commitMsg}
                    </p>
                  </td>

                  {/* Duration */}
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--t2)', fontFamily: 'var(--mono)' }}>
                      {formatDuration(deploy.duration)}
                    </span>
                  </td>

                  {/* Lighthouse */}
                  <td style={{ padding: '12px 16px' }}>
                    {deploy.lighthouse ? (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <LighthouseScore score={deploy.lighthouse.performance} />
                        <span style={{ color: 'var(--t3)', fontSize: '10px' }}>/</span>
                        <LighthouseScore score={deploy.lighthouse.accessibility} />
                        <span style={{ color: 'var(--t3)', fontSize: '10px' }}>/</span>
                        <LighthouseScore score={deploy.lighthouse.seo} />
                      </div>
                    ) : (
                      <span style={{ color: 'var(--t3)', fontSize: 'var(--text-xs)' }}>—</span>
                    )}
                  </td>

                  {/* Time */}
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--t3)' }}>
                      {formatRelativeTime(deploy.createdAt)}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
