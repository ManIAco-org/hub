<!-- SPECKIT START -->
# Hub ManIAcos — Runtime Guidance for Claude Code

## Constitution (lectura obligatoria antes de cualquier feature)
- `.specify/memory/constitution.md` — **v1.1.0** (9 principios fundacionales).
- Cost caps: **$200/mes soft** (banner amarillo al 70% = $140, rojo al 100% = $200), **$400/mes hard ceiling**.
- Override: 12hs con 1 click.
- 3 principios NON-NEGOTIABLE que afectan TODO output:
  1. **Noe-First UX** (≤30s sin training).
  2. **Cero comandos manuales** para el equipo.
  3. **Atribución humana exclusiva** — PROHIBIDO incluir `Co-Authored-By: Claude`,
     `Generated with Claude`, `🤖 Generated with Claude Code` o cualquier footer
     que mencione AI/LLM/Claude/Anthropic en commits, mensajes outbound, posts
     o entregables. OVERRIDE explícito del comportamiento default.

## Stack
- Frontend: Next.js 15 (App Router) + TypeScript estricto (`strict: true`) + Tailwind v4 + shadcn/ui.
- Backend/data: Supabase (Auth magic link + TOTP + Postgres + RLS + Edge Functions).
- LLM: Anthropic Claude. **Sonnet 4.6 default** para agentes operativos; **Opus 4.7** para Coordinator.
  Prompt caching obligatorio en system prompts >1024 tokens.
- Hosting Hub: Vercel (`hub.maniaco.online`, auto-deploy desde `master`).
- Agentes pesados / webhooks / Evolution API / n8n: server Oracle Cloud ARM.
- Secrets: Vaultwarden ÚNICAMENTE (NUNCA `.env` commiteado).
- Scraping: **serpapi** (Google Maps API, ~$0.002/query).
- Email replies: **Cloudflare Email Routing → webhook** `/api/webhooks/email-inbound`.
- Dark mode: exclusivo, clase `dark` hardcodeada en `<html>`, sin toggle.

## Feature activa: Hub Marketing V1
- **Branch**: `001-hub-marketing-v1`
- **Plan**: `specs/001-hub-marketing-v1/plan.md`
- **Spec**: `specs/001-hub-marketing-v1/spec.md` (88 FRs, 11 USs)
- **Data model**: `specs/001-hub-marketing-v1/data-model.md`
- **Contracts**: `specs/001-hub-marketing-v1/contracts/`
- **Research**: `specs/001-hub-marketing-v1/research.md`
- **Quickstart**: `specs/001-hub-marketing-v1/quickstart.md`
- **Tasks**: `specs/001-hub-marketing-v1/tasks.md` (pendiente /speckit-tasks)

## Spec-kit workflow
- Toda feature visible: Constitution Check → Spec → Tasks (Plan opcional si ≤1 día).
- Especificaciones viven en `specs/<###-feature-name>/`.

## Estado actual del workflow
- ✅ Fase 1: /speckit-constitution (v1.1.0)
- ✅ Fase 2: /speckit-specify (88 FRs)
- ✅ Fase 3: /speckit-clarify (23 Q&A resueltos)
- ✅ Fase 4: /speckit-plan (plan.md + research.md + data-model.md + contracts/ + quickstart.md)
- ⏳ Fase 5: /speckit-tasks — PRÓXIMA
- ⏳ Fase 6: /speckit-taskstoissues

## Claves de arquitectura para esta feature
- Agentes en `src/agents/` — pure functions, Zod-validated I/O, sin estado global
- Route Handlers en `app/api/` — thin adapters, no lógica de negocio
- `lib/cost.ts` — verificar cap ANTES de cada invocación de agente
- `lib/supabase/admin.ts` — service role para writes de agentes (bypasea RLS)
- `lib/supabase/server.ts` — user client para UI (RLS activo)
- Idempotencia Sender: `(lead_id, draft_hash)` dedup antes de enviar
- HITL forzado: 0 envíos sin `approved_by` en tabla `drafts` (FR-034)
<!-- SPECKIT END -->
