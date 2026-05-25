# Implementation Plan: Hub ManIAcos V1 — Departamento Marketing

**Branch**: `001-hub-marketing-v1` | **Date**: 2026-05-24 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-hub-marketing-v1/spec.md` (88 FRs, 11 USs, 12 SCs)

## Summary

Hub ManIAcos V1 es una aplicación web interna (3 usuarios) para el equipo de la consultora ManIAcos. El departamento Marketing V1 entrega un pipeline completo: scraping de leads via serpapi → enrichment con scoring IA → generación de drafts → aprobación HITL batch → envío por WhatsApp (Evolution API) y email (Resend) → clasificación de replies con Cloudflare Email Routing. Stack: Next.js 15 App Router + TypeScript estricto + Supabase (Auth + Postgres RLS + Edge Functions) + Anthropic Claude (Sonnet 4.6 / Opus 4.7) + Vercel. Dark mode exclusivo. Cero comandos manuales para operadores.

## Technical Context

**Language/Version**: TypeScript 5.x (strict: true, noUncheckedIndexedAccess: true) + Next.js 15 (App Router)

**Primary Dependencies**:
- `next@15`, `react@19`, `@supabase/supabase-js@2`, `@supabase/ssr`
- `@anthropic-ai/sdk` (Sonnet 4.6 + Opus 4.7, prompt caching)
- `shadcn/ui` + `tailwindcss@4` + `lucide-react`
- `zod` (runtime validation en todos los agent outputs)
- `resend` SDK
- `serpapi` (Google Search API Node client)
- `@dnd-kit/core` (drag-and-drop kanban)
- `framer-motion` (swipe gesture en approval queue)
- `@codemirror/view` + `@uiw/react-codemirror` (vault markdown editor)
- `remark` + `remark-html` (markdown preview)
- `isomorphic-git` (git operations para vault sync desde Edge Function)

**Storage**:
- PostgreSQL via Supabase (RLS habilitado, schema definido en `supabase/migrations/`)
- Supabase Storage (backups de DB mensuales)
- Git repo `ManIAco-org/vault` montado en `/srv/maniacos/vault/` en Oracle ARM

**Testing**:
- Playwright (5 smoke tests E2E, corren en CI pre-deploy a `hub.maniaco.online`)
- Vitest (unit tests para utils: cost-calculator, dedup, phone-normalizer — opcionales V1)

**Target Platform**:
- Frontend: Vercel (Hobby plan, custom domain `hub.maniaco.online`, auto-deploy desde `master`)
- Backend/DB: Supabase (hosted, región US-East)
- Agentes pesados / webhooks: Oracle Cloud ARM (n8n, Evolution API `evolution.maniaco.online`, Caddy)
- Vault: `/srv/maniacos/vault/` en Oracle ARM, sincronizado via git

**Project Type**: Web application (Next.js full-stack, App Router con Server Components + Client Components + Route Handlers)

**Performance Goals**:
- Dashboard initial load: <2s (SC-003, FR-010)
- Approval queue decision UX: ≤6s/decision, 100 drafts en ≤10 min (SC-002)
- P95 operaciones interactivas (excl. agentes IA): <500ms (SC-012)
- Time-to-vibe (URL → sesión activa): <10s (SC-003)

**Constraints**:
- Cost: $200/mes soft cap, $400/mes hard ceiling (constitution v1.1.0)
- Browser: Chromium-based desktop únicamente (Chrome/Edge/Brave), viewport ≥1280x800
- Usuarios: 3 admins únicamente (Franco/Lucho/Noe), sin multi-tenant
- Auth: solo emails `@maniaco.online`, magic link + TOTP opcional
- Atribución: PROHIBIDO Co-Authored-By Claude / footers AI (Principio III)
- Dark mode exclusivo (FR-086)

**Scale/Scope**: 3 usuarios, <1000 leads simultáneos, 200 mensajes salientes/día, 5 agentes IA

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked post Phase 1 design.*

| Principio | ¿Cumple? | Evidencia / Acción |
|-----------|----------|-------------------|
| **I. Noe-First UX (≤30s)** | ✅ PASS | US6 approval queue con atajos teclado; FR-087 empty states con CTAs; SC-001 Noe E2E 15 min. Validación: test de usabilidad con Noe antes de merge. |
| **II. Cero Comandos Manuales** | ✅ PASS | Vault sync via hooks automáticos (SessionStart pull, Stop push); UI para toda operación; sin `git/docker/ssh` expuesto al equipo. |
| **III. Atribución Humana Exclusiva** | ✅ PASS | FR-077/078/079: pre-commit hook valida strings prohibidas; Sender firma con nombre del socio; Writer constraint (FR-083) sin mención AI. |
| **IV. HITL para acciones irreversibles** | ✅ PASS | FR-034: cero envíos sin aprobación explícita. FR-066: Coordinator requiere confirmación antes de ejecutar. FR-082: warning en 2do mensaje sin respuesta. |
| **V. Vault como Single Source of Truth** | ✅ PASS | FR-060/061: vault UI con auto-commit git en ≤30s. Estructura `clientes/decisiones/lessons-learned/specs/sesiones/`. |
| **VI. Cost-Aware** | ✅ PASS | FR-071..075: `agent_runs` registra cada invocación. Chips de costo en header. Banners 70%/100%. Hard ceiling $400 bloquea agentes. |
| **VII. Simplicidad Sobre Generalidad** | ✅ PASS | Sin multi-tenant, sin roles diferenciados, sin abstracción prematura. Schema sin `tenant_id`. |
| **VIII. Vibecoding-Native Architecture** | ✅ PASS | File structure plana (`src/agents/`, `src/lib/`). Naming descriptivo extremo. JSDoc en funciones públicas. |
| **IX. Agents as Pure Functions** | ✅ PASS | Agents reciben input explícito, retornan Zod-validated output, side effects separados ("pensar" vs "ejecutar"). Idempotencia via `(lead_id, draft_hash)`. |

**Resultado**: PASS en todos los principios. No hay complexity violations a justificar.

## Project Structure

### Documentation (esta feature)

```text
specs/001-hub-marketing-v1/
├── plan.md              ← este archivo
├── research.md          ← Phase 0 (generado)
├── data-model.md        ← Phase 1 (generado)
├── quickstart.md        ← Phase 1 (generado)
├── contracts/           ← Phase 1 (generado)
│   ├── webhooks.md
│   ├── agent-contracts.md
│   └── api-routes.md
├── checklists/
│   └── requirements.md
└── tasks.md             ← Phase 2 (/speckit-tasks — aún no generado)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx              # Magic link form
│   │   └── auth/
│   │       └── callback/
│   │           └── route.ts          # Supabase auth callback
│   ├── (hub)/
│   │   ├── layout.tsx                # Shell: nav, CostChip header, toast
│   │   ├── dashboard/
│   │   │   └── page.tsx              # Dashboard general (US2)
│   │   ├── marketing/
│   │   │   ├── page.tsx              # Kanban leads (US3)
│   │   │   ├── [leadId]/
│   │   │   │   └── page.tsx          # Lead detail panel (FR-017)
│   │   │   ├── approval/
│   │   │   │   └── page.tsx          # Approval queue batch (US6)
│   │   │   └── analytics/
│   │   │       └── page.tsx          # Marketing dashboard (US9)
│   │   ├── vault/
│   │   │   └── page.tsx              # Vault editor (US10)
│   │   └── coordinator/
│   │       └── page.tsx              # Chat orchestrator (US11)
│   └── api/
│       ├── webhooks/
│       │   ├── evolution/
│       │   │   └── route.ts          # WA inbound webhook (FR-049 WA)
│       │   └── email-inbound/
│       │       └── route.ts          # Cloudflare email routing webhook (FR-049 email)
│       └── agents/
│           ├── scraper/
│           │   └── route.ts          # Lead Scraper trigger (FR-018..022)
│           ├── enrichment/
│           │   └── route.ts          # Enrichment Agent trigger (FR-023..027)
│           ├── writer/
│           │   └── route.ts          # Writer Agent trigger (FR-028..033)
│           ├── sender/
│           │   └── route.ts          # Sender Agent trigger (FR-041..048)
│           └── coordinator/
│               └── route.ts          # Coordinator trigger (FR-065..070)
├── agents/
│   ├── lead-scraper.ts               # serpapi → leads[]
│   ├── enrichment.ts                 # lead → {score, reasoning, dimensions}
│   ├── writer.ts                     # lead + context → draft
│   ├── reply-handler.ts              # reply text → classification
│   ├── sender.ts                     # draft → send via Evolution/Resend
│   └── coordinator.ts                # natural language → orchestrated steps
├── components/
│   ├── ui/                           # shadcn/ui primitives (generated)
│   └── hub/
│       ├── CostChip.tsx              # Header cost display (FR-056, FR-088)
│       ├── CostBanner.tsx            # Yellow/red banner (FR-073/074)
│       ├── KanbanBoard.tsx           # Lead pipeline kanban (US3)
│       ├── KanbanCard.tsx            # Lead card with score badge
│       ├── DraftApprovalCard.tsx     # Full-screen approval card (US6)
│       ├── DraftApprovalQueue.tsx    # Queue shell + keyboard shortcuts
│       ├── LeadDetailPanel.tsx       # Lead detail drawer (FR-017)
│       ├── ScoreBadge.tsx            # Color-coded score badge
│       ├── AgentProgressBar.tsx      # Live scraper/enrichment progress
│       ├── IncidentCard.tsx          # Incident alerts dashboard
│       ├── VaultEditor.tsx           # CodeMirror markdown + preview
│       ├── VaultFileTree.tsx         # Left panel file tree
│       └── CoordinatorChat.tsx       # Chat interface (US11)
├── lib/
│   ├── supabase/
│   │   ├── server.ts                 # createServerClient (cookies)
│   │   └── client.ts                 # createBrowserClient
│   ├── anthropic.ts                  # Anthropic SDK singleton + cost tracking
│   ├── evolution.ts                  # Evolution API HTTP client
│   ├── resend.ts                     # Resend SDK wrapper
│   ├── serpapi.ts                    # serpapi Google Maps wrapper
│   ├── cost.ts                       # Cost aggregation + cap enforcement
│   ├── phone.ts                      # Phone normalization (E.164)
│   ├── dedup.ts                      # Lead deduplication logic
│   ├── vault-sync.ts                 # Git operations for vault
│   └── whatsapp-health.ts            # WA health score calculator (FR-080)
├── types/
│   ├── database.ts                   # Generated by Supabase CLI (supabase gen types)
│   └── agents.ts                     # Zod schemas for all agent inputs/outputs
├── hooks/
│   ├── useRealtime.ts                # Supabase realtime subscription hook
│   ├── useCostBanner.ts              # Cost threshold state
│   └── useApprovalKeyboard.ts        # A/R/E/Spc keyboard handler (US6)
└── middleware.ts                     # Auth guard — redirect to /login if no session

supabase/
├── migrations/
│   ├── 0001_initial_schema.sql       # All tables, enums, indexes
│   ├── 0002_rls_policies.sql         # RLS policies per table
│   └── 0003_seed_users.sql           # 3 admin users seed
├── functions/
│   └── vault-git-sync/
│       └── index.ts                  # Edge Function: git pull/push vault repo
└── config.toml

tests/
└── e2e/
    ├── auth.spec.ts                  # Smoke 1: magic link + logout
    ├── lead.spec.ts                  # Smoke 2: create lead + kanban
    ├── outreach.spec.ts              # Smoke 3: approve draft + mock Evolution
    ├── dashboard.spec.ts             # Smoke 4: dashboard load + metrics
    └── vault.spec.ts                 # Smoke 5: create note + persistence

playwright.config.ts
```

**Structure Decision**: Next.js 15 App Router full-stack. Route groups `(auth)` y `(hub)` para separar layouts. Agentes en `src/agents/` como módulos puros (Principio IX). Route Handlers en `app/api/` como thin adapters. `lib/` para integraciones externas. No hay `backend/` separado — Supabase + Edge Functions cubren backend.

## Complexity Tracking

No hay violations al Constitution Check. Sin justificaciones requeridas.

## Sprint Plan (referencia, detalle en tasks.md)

| Sprint | Semana | Foco | USs Habilitadas |
|--------|--------|------|-----------------|
| S1 | 1 | Foundation: DB schema, Auth, layout shell, CostChip, dark mode | US1, US2 |
| S2 | 2 | Lead pipeline: kanban CRUD, Lead Scraper (serpapi) | US3 |
| S3 | 3 | Enrichment Agent + Writer Agent + Approval Queue HITL | US4, US5, US6 |
| S4 | 4 | Sender Agent + Reply Handler (Evolution + Cloudflare webhook) | US7, US8 |
| S5 | 5-6 | Marketing Dashboard, Vault UI, Coordinator, Smoke Tests, polish | US9, US10, US11 |

MVP funcional (P1: US1-US4): fin Sprint 2  
MVP comercial (P2: US1-US8): fin Sprint 4  
MVP completo (P3: US1-US11): fin Sprint 5
