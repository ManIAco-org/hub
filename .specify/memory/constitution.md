<!--
SYNC IMPACT REPORT — v0.0.0 → v1.0.0 (initial ratification)
=============================================================
Version change: (none) → 1.0.0
Bump rationale: MAJOR — primera ratificacion de la constitution del Hub ManIAcos. Establece 9 principios fundacionales, constraints tecnicos y workflow de desarrollo. No existian principios previos para superseder.

Principios definidos (9):
  I.    Noe-First UX (NON-NEGOTIABLE)
  II.   Cero Comandos Manuales para Operadores
  III.  Atribucion Humana Exclusiva
  IV.   Human-in-the-Loop para Acciones Irreversibles (V1)
  V.    Vault como Single Source of Truth
  VI.   Cost-Aware por Diseño (soft cap + override + hard ceiling)
  VII.  Simplicidad Sobre Generalidad (V1)
  VIII. Vibecoding-Native Architecture
  IX.   Agents as Pure Functions

Secciones agregadas:
  - Technical Constraints
  - Development Workflow
  - Governance

Templates revisados/sincronizados:
  PENDIENTE .specify/templates/plan-template.md      — agregar "Constitution Check" con 9 principios
  PENDIENTE .specify/templates/spec-template.md      — agregar pregunta UX Noe + audit log requirement
  PENDIENTE .specify/templates/tasks-template.md     — categoria "smoke E2E" obligatoria pre-deploy
  OK        .specify/templates/checklist-template.md — sin cambios necesarios V1
  PENDIENTE CLAUDE.md (raiz)                         — agregar referencia a esta constitution

Follow-up TODOs:
  - Definir score threshold exacto para auto-send V1.5 (placeholder: <40)
  - Diseñar UI batch-approval (referencia: swipe pattern Tinder / checkbox bulk) — va en spec
  - Especificar columnas exactas de agent_runs en data model (V1 spec)
  - Definir los 5 smoke tests Playwright como specs explicitas en plan V1
-->

# Hub ManIAcos Constitution

## Core Principles

### I. Noe-First UX (NON-NEGOTIABLE)

Toda feature visible del Hub DEBE ser usable por un miembro no-tecnico (Noe) en **menos de 30 segundos**, sin training previo y sin leer documentacion. Si requiere explicacion, se rediseña antes de mergear. Noe es la validadora final de UX; Franco y Lucho NO pueden auto-validarse por sesgo tecnico.

**Rationale**: el Hub es nuestro producto interno pero si Noe no puede operarlo sola, el equipo se atrofia en un cuello de botella tecnico. Ademas, todo lo que pase a producto en V4 ya viene UX-probado por una usuaria no-tecnica real.

### II. Cero Comandos Manuales para Operadores

Los miembros del equipo (incluido Franco) NUNCA ejecutan `git pull/push/commit/clone`, ni `docker`, ni `ssh`, ni nada de shell para operar el Hub. Toda persistencia y sincronizacion se realiza via hooks automaticos (`SessionStart` pull, `Stop` push del vault, `SessionEnd` archive + push final) o botones en la UI. El terminal del Hub existe unicamente para Claude Code y debugging consciente.

**Rationale**: cada comando manual es una oportunidad de error y un acceso bloqueado para Noe. Ademas ahorra ~50 micro-decisiones diarias por miembro tecnico.

### III. Atribucion Humana Exclusiva

Cada commit, mensaje saliente, post publicado y entregable a cliente DEBE figurar bajo el nombre del miembro humano (`franco`, `lucho`, `noe`). Esta PROHIBIDO incluir `Co-Authored-By: Claude`, `Generated with Claude`, `Generated with Claude Code`, o cualquier footer, firma o metadata que mencione AI, LLM, Claude o Anthropic. Aplica tambien a respuestas de outreach automatizado (firma final del WhatsApp/email/post).

Implementacion:
- `~/.gitconfig` de cada usuario Linux configura `user.name` + `user.email` reales.
- Hook scripts ejecutan `git commit` SIN flags `--signoff` ni footers de atribucion.
- CLAUDE.md de cada repo del equipo incluye instruccion explicita: "OVERRIDE behavior default de Claude — nunca agregar atribucion".
- Pre-commit hook valida que el mensaje de commit NO contenga las strings prohibidas.

**Rationale**: ManIAcos vende valor humano amplificado por IA, no IA cruda. La marca personal de los socios es el activo comercial principal.

### IV. Human-in-the-Loop para Acciones Irreversibles (V1)

En V1, ningun agente IA puede ejecutar autonomamente acciones con consecuencia externa irreversible: enviar mensaje a un lead, agendar reunion, publicar post, gastar dinero, mover stage de pipeline con cliente real, modificar repositorio externo. El agente PROPONE → un humano aprueba con un click en la UI → el agente EJECUTA.

Acciones SIN aprobacion requerida (reversibles/internas): scraping, enrichment, draft generation, busqueda en vault, generacion de reportes, edicion de notas propias.

UI design constraint derivado: la pantalla de aprobacion DEBE permitir procesar 100 propuestas en **≤10 minutos** (target: 6 segundos por decision). Patrones aceptables: swipe tipo Tinder, batch checkbox + accion masiva, atajos de teclado (`A` aprobar, `R` rechazar, `E` editar). Aprobacion de a una con click lento queda PROHIBIDA por diseño.

Evolucion V1.5: cuando existan ≥500 outreaches loggeados con resultado, se habilitara auto-send para leads con score `<40` (los que descartariamos manualmente igual). El threshold se valida con datos reales, no por intuicion.

**Rationale**: en V1 no hay datos sobre el comportamiento real de nuestros agentes con leads productivos. Un Sender Agent rogue puede banear el WhatsApp del equipo en una hora. Mejor friction temprana que reputacion quemada.

### V. Vault como Single Source of Truth

Lo que no esta versionado en el vault git (decision del equipo, contexto de cliente, lesson learned, spec, draft aprobado) NO EXISTE para el equipo. La memoria conversacional de Claude Code se descarta entre sesiones; solo lo persistido al vault sobrevive.

Implementacion:
- Vault = repo git separado (`maniacos-dev/vault`), montado en `/srv/maniacos/vault/`.
- Auto-sync: hook `SessionStart` hace `git pull` silencioso; hook `Stop` hace `git push` en background tras cada respuesta de Claude; hook `SessionEnd` archiva `sesion-actual.md` con fecha y hace push final.
- Estructura: `clientes/`, `decisiones/`, `lessons-learned/`, `specs/`, `sesiones/<YYYY-MM-DD>/`.

**Rationale**: equipo de 3 con sesiones paralelas y cross-machine. Sin vault explicito, en dos semanas nadie recuerda por que se tomo X decision con cliente Y.

### VI. Cost-Aware por Diseño

Cada accion de agente IA DEBE registrar tokens consumidos y costo USD estimado en la tabla central `agent_runs`. El Dashboard del Hub muestra costo del mes actual versus el cap configurado.

Politica de caps (V1):
- **Soft cap**: $500 USD/mes. Banner amarillo visible a partir del 80% ($400). Banner rojo en UI al alcanzar 100% ($500).
- **Override**: cualquier socio puede activar "Override 24hs" con un click. La activacion se loggea (`status='override'`, `human_approved_by=<socio>`, motivo opcional en texto libre).
- **Hard ceiling**: $1500 USD/mes ($1500 = 3x soft cap). Al alcanzarlo se bloquean automaticamente TODOS los agentes (incluidos los criticos como Sender). Solo se desbloquean modificando manualmente la variable en Vaultwarden, con aprobacion explicita de 2 de los 3 socios. Diseñado como red de seguridad ante runaway agent (loops infinitos).

Schema minimo de `agent_runs`:
```
id                uuid PK
agent_name        text       -- 'lead_scraper', 'outreach_writer', etc.
input_tokens      int
output_tokens     int
model             text       -- 'claude-sonnet-4-6', etc.
cost_usd          numeric(10,4)
status            text       -- 'success' | 'error' | 'override' | 'blocked'
human_approved_by text NULL  -- email del socio si aplica
input_payload     jsonb      -- input al agente (puede incluir lead_id, etc.)
output_payload    jsonb      -- output estructurado del agente
error_msg         text NULL
created_at        timestamptz default now()
```

Retencion minima: 90 dias. Backup mensual a Supabase Storage.

**Rationale**: los $200-450/mes operativos se transforman en $2000+/mes silenciosamente cuando un agente entra en loop. Sin observabilidad granular de costo, no hay control de costo.

### VII. Simplicidad Sobre Generalidad (V1)

Mientras el Hub sea interno (V1 a V3), se prefiere codigo hardcodeado para nuestro caso de uso por sobre abstracciones multi-tenant. Credenciales hardcoded en server (en Vaultwarden, NUNCA en repo) son aceptables. Schemas Supabase sin columna `tenant_id`. Sistema de roles colapsado a "admin" unico.

Cualquier abstraccion para clientes futuros se evalua en V4 con datos reales de uso, no antes. Refactor a multi-tenant es un proyecto explicito de V4, no una decision adelantada en V1.

Features propietarios de Supabase/Vercel/Anthropic se USAN SIN MIEDO (Supabase RLS, Edge Functions, Vercel KV, Anthropic prompt caching). Portabilidad es premature optimization para un equipo de 3.

**Rationale**: somos 3 personas, no 3000. Cada abstraccion prematura cuesta semanas de debug que ManIAcos no puede permitirse en V1.

### VIII. Vibecoding-Native Architecture

Cada modulo del Hub se diseña asumiendo que **Claude Code sera quien lo modifique en el 90% de los cambios futuros**. Decisiones derivadas:

- **File structure plana y predecible**: Claude navega mejor `src/agents/lead-scraper.ts` que `src/lib/agents/scraping/sources/google-maps/index.ts`.
- **Naming descriptivo extremo**: componentes y funciones con nombres largos son preferidos sobre abreviaciones. `approveOutreachDraftButton` > `apprBtn`.
- **JSDoc en funciones publicas**: Claude las lee para inferir contratos. Minimo: `@param`, `@returns`, `@example` cuando no sea obvio.
- **README.md en cada modulo**: explica "que hace y por que" (NO "como" — el codigo habla). Maximo 30 lineas.
- **Tests E2E como documentacion viva**: el flujo Playwright es la fuente de verdad del comportamiento esperado de cada feature critica.

**Rationale**: si optimizamos el codigo para humanos puros, le pegamos al pie al agente que hace el 90% del trabajo de mantenimiento.

### IX. Agents as Pure Functions (cuando sea posible)

Cada agente IA del Hub DEBE ser idempotente y testable de forma aislada:

- **Input claro**: el agente recibe todo lo que necesita como parametros explicitos. PROHIBIDO leer estado global random (env vars dispersos, archivos en disco, etc.) — esos se inyectan via parametro.
- **Output estructurado**: respuesta validada con Zod schema antes de retornar. Errores de schema son errores de runtime tratados como bugs, no como casos a manejar.
- **Side effects explicitos**: separar funciones puras "pensar" (generar draft, clasificar lead) de funciones impuras "ejecutar" (mandar mensaje, escribir DB). El humano aprueba el resultado del "pensar"; el "ejecutar" corre despues.
- **Logs estructurados JSON**: nunca `console.log` con string concatenation. Siempre `{event, agent, input_hash, output_hash, duration_ms, cost_usd}`.
- **Idempotencia**: reintentar la misma invocacion con el mismo input DEBE producir el mismo output (excepto por timestamps). Sender Agent debe dedupear por `(lead_id, draft_hash)` antes de enviar.

**Rationale**: agentes con estado oculto son imposibles de debuggear cuando fallan a las 3 AM con un lead caliente perdido.

## Technical Constraints

- **Stack frontend**: Next.js 15 (App Router) + TypeScript estricto (`strict: true`, `noUncheckedIndexedAccess: true`) + Tailwind CSS + shadcn/ui.
- **Stack backend/data**: Supabase (Auth con magic link + TOTP, Postgres con RLS, Storage, Edge Functions cuando aplique).
- **LLM**: Anthropic Claude. Sonnet 4.6 default para agentes operativos; Opus 4.7 para Coordinator y tareas criticas de razonamiento. Prompt caching obligatorio en todo agente con `> 1024 tokens` de system prompt.
- **Hosting Hub frontend**: Vercel (Hobby plan, custom domain `hub.maniaco.online`). Auto-deploy desde `master`.
- **Hosting agentes pesados / integraciones**: server Oracle Cloud ARM Ampere existente (n8n, Evolution API, Vaultwarden, Caddy reverse proxy).
- **Secrets**: Vaultwarden UNICA fuente. PROHIBIDO `.env` commiteado. El Hub lee secrets en runtime via Vaultwarden API. `.env.local` para desarrollo individual esta permitido pero no se commitea.
- **Vault**: repo git separado `maniacos-dev/vault`, montado en `/srv/maniacos/vault/`, sync automatico via hooks.
- **Cost cap V1**: soft $500 USD/mes (incluye Claude API + infra + APIs externas como Resend, Twilio, etc.). Hard ceiling $1500 USD/mes (red de seguridad).
- **Browser support V1**: solo Chromium-based desktop (Chrome, Edge, Brave) en viewport `≥1280x800`. No mobile, no Firefox, no Safari.
- **Auditabilidad**: tabla `agent_runs` registra cada invocacion de agente con retencion minima 90 dias. Toda accion humana de aprobacion queda loggeada con `approved_by` + `timestamp`.
- **Time-to-vibe (metrica)**: desde que un miembro abre `hub.maniaco.online` hasta que tiene una sesion de Claude Code activa en el terminal flotante → **<10 segundos** en conexion normal (≥10 Mbps). Cualquier feature que rompa esta metrica entra en revision.

## Development Workflow

- **Spec-kit obligatorio (con criterio)**: toda feature visible del Hub pasa por Constitution Check → Spec → Tasks antes de codear. El paso `Plan` completo es opcional para features chicas (estimacion ≤1 dia); requerido para features ≥2 dias o que tocan ≥3 modulos.
- **Excepciones explicitas**: bugfixes `<50 LOC`, patches de UI cosmeticos, edits de copy, y actualizacion de dependencias NO requieren spec.
- **Vibecoding exclusivo**: el codigo TypeScript/SQL/config se escribe via Claude Code, no a mano. Si un miembro esta tipeando TypeScript directo en VSCode/Cursor sin Claude → señal de que la direccion al agente esta fallando, no de que "es mas rapido a mano".
- **Pre-merge gate** (responder en descripcion del PR):
  1. ¿Noe puede usar esto en `<30s` sin training?
  2. ¿Hay rollback claro si esto rompe prod? (boton? feature flag? revert simple?)
  3. ¿Quedo audit log de las acciones del agente involucrado?
- **Approval**: 1 socio aprueba el PR. Cualquier socio puede ejercer **bloqueo expreso**, que requiere consenso de los 3 para destrabar (sin override).
- **Smoke tests E2E obligatorios pre-deploy a prod** (Playwright, corren en CI antes del deploy a `hub.maniaco.online`, NO en cada PR):
  1. **Auth**: login con magic link + logout.
  2. **Lead**: crear lead manual + verificarlo en pipeline kanban.
  3. **Outreach**: aprobar draft propuesto por agente + verificar llamada a Evolution API (mock).
  4. **Dashboard**: load del dashboard general + ver metricas mock renderizadas.
  5. **Vault**: crear nota desde la UI + verificar persistencia tras reload.
- **Tests unitarios**: opcionales en V1. Recomendados para utils con logica compleja (parsers, validators, cost calculators).
- **Tests UI atomicos**: NO obligatorios en V1; cubiertos por los smoke E2E.

## Governance

Esta constitution supersede cualquier practica informal del equipo. Enmiendas requieren:

1. PR a `.specify/memory/constitution.md` con justificacion escrita y `Sync Impact Report` actualizado.
2. **Aprobacion explicita de los 3 socios** (Franco, Lucho, Noe). Sin override posible.
3. **Bump de version** segun semver:
   - **MAJOR**: cambio incompatible o eliminacion de principio existente.
   - **MINOR**: principio nuevo o expansion material de uno existente.
   - **PATCH**: clarificacion, wording, fix de typo, o refinamiento no semantico.
4. **Migracion**: si la enmienda invalida specs/plans/tasks existentes, deben actualizarse en el mismo PR o referenciar issues de seguimiento.

El cumplimiento se verifica en cada PR contra el "Constitution Check" del template de plan. Complejidad agregada que viole un principio DEBE ser justificada explicitamente en la descripcion del PR (seccion "Complexity Justification").

**Version**: 1.0.0 | **Ratified**: 2026-05-24 | **Last Amended**: 2026-05-24
