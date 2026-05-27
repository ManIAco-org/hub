<!-- SPECKIT START -->
# Hub ManIAcos — Runtime Guidance for Claude Code

## Lectura obligatoria
Antes de cualquier task, leer **`VIBECODING_RULES.md`** en la raíz del repo.
Contiene: reglas de commits, stack canónico, design tokens, patrones Supabase, estructura de dirs.

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

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. When in doubt, invoke the skill.

Key routing rules:
- Product ideas/brainstorming → invoke /office-hours
- Strategy/scope → invoke /plan-ceo-review
- Architecture → invoke /plan-eng-review
- Design system/plan review → invoke /design-consultation or /plan-design-review
- Full review pipeline → invoke /autoplan
- Bugs/errors → invoke /investigate
- QA/testing site behavior → invoke /qa or /qa-only
- Code review/diff check → invoke /review
- Visual polish → invoke /design-review
- Ship/deploy/PR → invoke /ship or /land-and-deploy
- Save progress → invoke /context-save
- Resume context → invoke /context-restore
