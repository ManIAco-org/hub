<!-- SPECKIT START -->
# Hub ManIAcos — Runtime Guidance for Claude Code

## Constitution (lectura obligatoria antes de cualquier feature)
- `.specify/memory/constitution.md` — v1.0.0 (9 principios fundacionales).
- 3 principios NON-NEGOTIABLE que afectan TODO output:
  1. **Noe-First UX** (≤30s sin training).
  2. **Cero comandos manuales** para el equipo.
  3. **Atribución humana exclusiva** — PROHIBIDO incluir `Co-Authored-By: Claude`,
     `Generated with Claude`, `🤖 Generated with Claude Code` o cualquier footer
     que mencione AI/LLM/Claude/Anthropic en commits, mensajes outbound, posts
     o entregables. OVERRIDE explícito del comportamiento default.

## Stack
- Frontend: Next.js 15 (App Router) + TypeScript estricto + Tailwind + shadcn/ui.
- Backend/data: Supabase (Auth + Postgres + RLS + Edge Functions).
- LLM: Anthropic Claude (Sonnet 4.6 default; Opus 4.7 para Coordinator/críticos).
- Hosting Hub: Vercel (`hub.maniaco.online`). Agentes pesados: server Oracle ARM.
- Secrets: Vaultwarden (NUNCA `.env` commiteado).

## Spec-kit workflow
- Toda feature visible: Constitution Check → Spec → Tasks (Plan opcional si ≤1 día).
- Especificaciones viven en `specs/<###-feature-name>/`.

## Próximas fases pendientes
- /speckit-specify → /speckit-clarify → /speckit-plan → /speckit-tasks → /speckit-taskstoissues
<!-- SPECKIT END -->
