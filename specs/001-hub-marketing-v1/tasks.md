# Tasks: Hub ManIAcos V1 — Departamento Marketing

**Branch**: `001-hub-marketing-v1`  
**Input**: `specs/001-hub-marketing-v1/` (plan.md, spec.md, data-model.md, contracts/, research.md, quickstart.md)  
**Total tasks**: 168 | **Smoke tests**: 5 (Playwright, obligatorios pre-deploy, fase final)

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Paralelizable (archivos distintos, sin dependencias incompletas)
- **[Story]**: User Story de `spec.md` (US1–US11)
- Paths según `plan.md` — stack Next.js 15 App Router

---

## Phase 1: Setup (Infraestructura inicial)

**Purpose**: Inicializar el repo del Hub, tooling, configuración base.

- [ ] T001 Crear proyecto Next.js 15 con `bun create next-app hub --typescript --tailwind --app --src-dir` en raíz del repo
- [ ] T002 Instalar dependencias principales: `@supabase/supabase-js @supabase/ssr @anthropic-ai/sdk resend zod @dnd-kit/core @dnd-kit/sortable framer-motion lucide-react` en `package.json`
- [ ] T003 [P] Instalar dependencias de agentes: `serpapi libphonenumber-js @uiw/react-codemirror @codemirror/lang-markdown remark remark-html isomorphic-git` en `package.json`
- [ ] T004 [P] Instalar shadcn/ui: ejecutar `bunx shadcn@latest init` con configuración dark mode, slate base, CSS variables; instalar componentes: `button card badge toast dialog sheet tabs input textarea separator skeleton scroll-area`
- [ ] T005 Configurar `tsconfig.json`: `strict: true`, `noUncheckedIndexedAccess: true`, path aliases `@/*` → `./src/*`
- [ ] T006 [P] Configurar `tailwind.config.ts` con dark mode class, paleta ManIAcos (`background: #0a0a0a`, `surface: #111111`, `foreground: #f5f5f5`)
- [ ] T007 [P] Crear `src/app/globals.css` con CSS variables dark mode hardcodeadas (sin toggle), `color-scheme: dark` en `:root`
- [ ] T008 Configurar ESLint con reglas strict (`@typescript-eslint/recommended`, `@typescript-eslint/no-explicit-any: error`)
- [ ] T009 [P] Inicializar Supabase CLI: `supabase init` en raíz del repo; crear `supabase/config.toml` con proyecto local
- [ ] T010 [P] Configurar Playwright: `playwright.config.ts` con proyecto Chromium-only, base URL `localhost:3000`, timeouts 30s
- [ ] T011 Crear `src/types/agents.ts` con Zod schemas vacíos (estructura base) para los 6 agentes — se rellenan en cada fase
- [ ] T012 [P] Crear `.env.local.example` con todas las variables de entorno documentadas (sin valores reales) según `quickstart.md`

---

## Phase 2: Foundational (Prerequisitos bloqueantes)

**Purpose**: DB schema completo, auth infra, layout shell, cost system, libs de integración. Nada de user stories puede empezar sin esto.

**⚠️ CRÍTICO**: Completar 100% antes de cualquier fase de User Story.

### DB Schema y migraciones

- [ ] T013 Crear `supabase/migrations/0001_initial_schema.sql` con todos los enums (`lead_status`, `lead_channel`, `lead_source`, `draft_status`, `message_delivery_status`, `reply_classification`, `agent_run_status`, `cost_cap_status`) según `data-model.md`
- [ ] T014 Agregar a `supabase/migrations/0001_initial_schema.sql`: tablas `users`, `leads` (con todos los campos incluyendo `tags text[]`, `telefono_normalizado`, `nombre_normalizado`, `dominio_web_normalizado`), `lead_history`, `campaigns` según `data-model.md`
- [ ] T015 Agregar a `supabase/migrations/0001_initial_schema.sql`: tablas `drafts` (con `draft_hash` unique index), `messages` (con `resend_message_id`, `evolution_message_id`), `replies` (con `external_reply_id` unique), `do_not_contact` según `data-model.md`
- [ ] T016 Agregar a `supabase/migrations/0001_initial_schema.sql`: tablas `agent_runs`, `cost_monthly_summary`, `incidents`, `vault_notes` (con `content_tsvector` generado), `auth_events`, `whatsapp_health` según `data-model.md`
- [ ] T017 Agregar a `supabase/migrations/0001_initial_schema.sql`: todos los indexes definidos en `data-model.md` (leads status/telefono/dominio/tags/score, drafts/messages/replies indexes, cost_monthly_summary)
- [ ] T018 Agregar a `supabase/migrations/0001_initial_schema.sql`: trigger `update_updated_at()` en `leads`, trigger `update_cost_monthly_summary()` en `agent_runs` con lógica upsert según `data-model.md` / `research.md` (R-015)
- [ ] T019 Agregar funciones Postgres: `check_lead_duplicate(p_telefono, p_dominio, p_nombre)` retorna `uuid` según algoritmo de `research.md` (R-012); `extract_domain(url text)` retorna dominio normalizado; extensión `unaccent` habilitada
- [ ] T020 Crear `supabase/migrations/0002_rls_policies.sql` con todas las RLS policies de `data-model.md`: `SELECT` para todos los usuarios autenticados en todas las tablas; `INSERT/UPDATE` según restricciones de cada tabla; service role bypass
- [ ] T021 Crear `supabase/migrations/0003_seed_users.sql` con los 3 admins: `franco@maniaco.online` (gitconfig_name: "Franco San Martín"), `lucho@maniaco.online`, `noe@maniaco.online`
- [ ] T022 Ejecutar `supabase db push` localmente y verificar que las 3 migraciones aplican sin errores; ejecutar `supabase gen types typescript --local > src/types/database.ts`

### Supabase clients y middleware

- [ ] T023 Crear `src/lib/supabase/server.ts`: función `createServerClient()` usando `@supabase/ssr` con cookies de Next.js; para uso en Server Components y Route Handlers con sesión de usuario (RLS activo)
- [ ] T024 [P] Crear `src/lib/supabase/client.ts`: función `createBrowserClient()` con `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` para Client Components
- [ ] T025 [P] Crear `src/lib/supabase/admin.ts`: función `createAdminClient()` con `SUPABASE_SERVICE_ROLE_KEY` (bypasea RLS); usar SOLO en Route Handlers de agentes, nunca en Client Components
- [ ] T026 Crear `src/middleware.ts`: protección de rutas `(hub)/*` y `api/agents/*`; verificar sesión con `createServerClient`; bloquear emails que no terminen en `@maniaco.online` (FR-001); redirect a `/login` si no autenticado

### Librerías de integración y utilidades

- [ ] T027 Crear `src/lib/cost.ts`: función `checkCostCap(supabase)` que consulta `cost_monthly_summary`, retorna `CostCapStatus`, verifica hard ceiling ($400) y soft cap ($200); función `recordAgentRun(supabase, run)` que inserta en `agent_runs` según schema de `data-model.md`
- [ ] T028 [P] Crear `src/lib/phone.ts`: función `normalizePhone(raw: string): string | null` usando `libphonenumber-js` con default country `AR`, retorna E.164 o null (R-011)
- [ ] T029 [P] Crear `src/lib/dedup.ts`: función `checkLeadDuplicate(supabase, telefono, dominio, nombre): Promise<string | null>` que llama a la función Postgres `check_lead_duplicate` (R-012)
- [ ] T030 [P] Crear `src/lib/anthropic.ts`: singleton Anthropic client; función `callClaude({ model, systemPrompt, userMessage, cacheSystemPrompt, agentName, leadId, draftId, supabase })` que llama con `cache_control: ephemeral` cuando `cacheSystemPrompt=true`, registra `agent_runs` automáticamente, verifica cap antes de cada llamada (R-007)
- [ ] T031 [P] Crear `src/lib/evolution.ts`: cliente HTTP para Evolution API (`EVOLUTION_API_URL`, `EVOLUTION_API_KEY`); funciones `sendWhatsApp(jid, message): Promise<{id: string}>` y `validateWebhookSecret(header, secret): boolean`
- [ ] T032 [P] Crear `src/lib/resend.ts`: wrapper Resend SDK; función `sendEmail({ to, from, subject, body, replyTo })` retorna `{ messageId: string }`; función `validateSvixSignature(payload, headers, secret): boolean`
- [ ] T033 [P] Crear `src/lib/serpapi.ts`: wrapper serpapi; función `searchGoogleMaps(query: string, start?: number): Promise<SerpApiLead[]>` usando endpoint `google_maps`; mapea campos a shape de `data-model.md` (R-004)

### Cost system y layout shell

- [ ] T034 Crear `src/hooks/useCostBanner.ts`: hook Client Component que hace `GET /api/cost/current`, retorna `{ status, percentage, totalCostUsd, softCap, hardCeiling }`; re-fetches cada 60s
- [ ] T035 Crear `src/components/hub/CostChip.tsx`: chip compacto `💰 $X / $200` en header; colores: verde <70%, amarillo 70-99%, rojo ≥100%; click abre modal de breakdown por agente (FR-056, FR-088)
- [ ] T036 Crear `src/components/hub/CostBanner.tsx`: banner full-width amarillo (70-99%) o rojo (≥100%) con botón "Override 12hs" que llama `POST /api/cost/override`; se renderiza condicionalmente en layout (FR-073, FR-074)
- [ ] T037 Crear `src/app/api/cost/current/route.ts`: GET handler que llama `cost.ts` y retorna el shape de `contracts/api-routes.md`
- [ ] T038 [P] Crear `src/app/api/cost/override/route.ts`: POST handler que inserta `agent_runs` con `status='override'`, `human_approved_by=session.email`, expira en 12hs (FR-074)
- [ ] T039 Crear `src/app/(hub)/layout.tsx`: shell del Hub — header con logo ManIAcos, nav links (Dashboard, Marketing, Vault, Coordinator), `CostChip` en top-right, `CostBanner` condicional, Toaster para notificaciones; clase `dark` hardcodeada en `<html>` (FR-086)

**Checkpoint**: Foundation completa. Todas las user stories pueden empezar. DB corriendo local, RLS activo, cost system funcional, layout shell visible.

---

## Phase 3: User Story 1 — Login y entrada al Hub (P1) 🎯 MVP-ABSOLUTO

**Goal**: Auth con magic link, restricción `@maniaco.online`, TOTP opcional, sesión 30 días, time-to-vibe <10s.

**Independent Test**: Abrir `localhost:3000`, ingresar `franco@maniaco.online`, recibir magic link en Inbucket, hacer click, ver dashboard. Intentar con `hacker@gmail.com` → ver error. Verificar `auth_events` en DB.

- [ ] T040 [US1] Crear `src/app/(auth)/login/page.tsx`: formulario magic link — input email, botón "Entrar", validación client-side del dominio `@maniaco.online`; mostrar error "Solo dominios @maniaco.online autorizados" si no cumple (FR-001, FR-002); dark mode exclusivo
- [ ] T041 [US1] Crear `src/app/(auth)/auth/callback/route.ts`: handler de Supabase auth callback; intercambiar code por session; registrar `auth_events` (success/failed) con `ip` del request; redirect a `/dashboard` (FR-005)
- [ ] T042 [US1] Implementar logout en `src/app/(hub)/layout.tsx`: botón "Cerrar sesión" en header llama `supabase.auth.signOut()` y redirect a `/login` (FR-004)
- [ ] T043 [US1] Agregar meta `<link rel="preconnect">` y optimizaciones de carga inicial en `src/app/layout.tsx` para asegurar time-to-vibe <10s; configurar `next.config.ts` con `output: 'standalone'` para Vercel

**Checkpoint**: US1 completa. Magic link funciona, sesión persiste 30 días, email externo bloqueado, logs en `auth_events`.

---

## Phase 4: User Story 2 — Dashboard general con estado de departamentos (P1)

**Goal**: Una pantalla con cards de departamentos, feed actividad reciente, socios online, carga <2s.

**Independent Test**: Con datos seed, abrir `/dashboard`, verificar 6 cards visibles en 1280x800 sin scroll, feed con 10 acciones, avatar de usuario conectado con dot verde.

- [ ] T044 [US2] Crear `src/hooks/useRealtime.ts`: hook que suscribe a `supabase.channel('online-users')` con Presence (heartbeat 30s); retorna `onlineUsers: string[]` con emails de socios activos (R-005)
- [ ] T045 [US2] Crear `src/app/(hub)/dashboard/page.tsx` (Server Component): fetch de KPIs de Marketing (leads pendientes, drafts pendientes), renderizar 6 cards de departamentos con sus badges (FR-006, FR-007); feed de últimas 10 acciones desde `lead_history` (FR-008)
- [ ] T046 [P] [US2] Crear componente `src/components/hub/DepartmentCard.tsx`: card con nombre del departamento, KPI principal, badge "V2/V3" para deshabilitados (no ocultos), estado "online"
- [ ] T047 [P] [US2] Crear componente `src/components/hub/ActivityFeed.tsx`: lista de últimas 10 acciones con timestamp, autor humano, acción; se actualiza via Supabase Realtime subscription en `lead_history` (FR-008, R-005)
- [ ] T048 [US2] Agregar avatar de socios online en header de `src/app/(hub)/layout.tsx` usando `useRealtime` hook — dot verde para "online", avatar con inicial del nombre (FR-009)
- [ ] T049 [US2] Optimizar performance de `/dashboard`: usar React `Suspense` con skeletons para cada card; verificar LCP <2s con `bun run build && bunx next start` (FR-010, SC-003)

**Checkpoint**: US2 completa. Dashboard carga <2s, cards de departamentos visibles, feed de actividad, presencia online funcional.

---

## Phase 5: User Story 3 — Captura y visualización de leads (P1)

**Goal**: Kanban 8 estados, formulario manual, Lead Scraper via serpapi, filtros, dedup, panel de detalle.

**Independent Test**: Ingresar brief "panaderías en Córdoba, 10 leads" → Scraper corre → leads aparecen en columna `new` → filtrar por ciudad → verificar dedup con teléfono duplicado.

### Componentes UI de leads

- [ ] T050 [P] [US3] Crear `src/components/hub/ScoreBadge.tsx`: badge de color con score numérico — verde (≥70), amarillo (40-69), rojo (<40), gris (null/"Sin clasificar"); tooltip con reasoning (FR-017)
- [ ] T051 [P] [US3] Crear `src/components/hub/KanbanCard.tsx`: card para lead en kanban — nombre, industria, ciudad, `ScoreBadge`, tags como chips, indicador de canal (WA/email), assigned_to avatar (FR-014)
- [ ] T052 [P] [US3] Crear `src/components/hub/AgentProgressBar.tsx`: barra de progreso con `progress/total` y texto "Scrapeando: 7/15" — recibe datos via Supabase Realtime subscription en `campaigns.progress_count` (FR-021)
- [ ] T053 [US3] Crear `src/components/hub/KanbanBoard.tsx`: tablero con 8 columnas (`new|enriched|approved|sent|replied|qualified|closed|dead`), drag-and-drop con `@dnd-kit`, filtros por `industria/ciudad/score/status/tags` en sidebar, contador por columna (FR-014, FR-015, FR-016, FR-085)
- [ ] T054 [US3] Crear `src/components/hub/LeadDetailPanel.tsx`: drawer lateral con datos completos del lead, score+reasoning, historial `lead_history` con timestamps, conversación (mensajes enviados + replies), tags editables, assigned_to selector, botones "Generar draft" / "Override score" (FR-017, FR-027)

### Backend de leads

- [ ] T055 [US3] Crear `src/app/(hub)/marketing/page.tsx`: Server Component que carga leads iniciales desde Supabase; renderiza `KanbanBoard`; Client Component wrapper para Realtime updates de cambios en `leads` (R-005)
- [ ] T056 [P] [US3] Crear `src/app/(hub)/marketing/[leadId]/page.tsx`: Server Component que carga lead por ID con su historial, mensajes y replies; renderiza `LeadDetailPanel`
- [ ] T057 [US3] Crear `src/app/api/leads/route.ts`: POST handler para crear lead manual — validar teléfono con `phone.ts`, dedup con `dedup.ts`, normalizar dominio, INSERT en `leads` + `lead_history`; validar campos mínimos (FR-011, FR-012, FR-013)
- [ ] T058 [US3] Crear `src/app/api/leads/[leadId]/route.ts`: PATCH handler para actualizar lead (status, assigned_to, tags, score override); INSERT automático en `lead_history` con diff; validar que solo socios autenticados pueden modificar (FR-015, FR-027)

### Lead Scraper agent

- [ ] T059 [US3] Crear `src/agents/lead-scraper.ts`: implementar `runLeadScraper(input: LeadScraperInput)` completo según `contracts/agent-contracts.md` — loop serpapi con paginación, normalización de campos, dedup por `check_lead_duplicate`, batch inserts, update de `campaigns.progress_count` cada 10 leads, registro en `agent_runs` sin tokens LLM
- [ ] T060 [US3] Agregar Zod schema `LeadScraperInputSchema` y `LeadScraperOutputSchema` en `src/types/agents.ts` según `contracts/agent-contracts.md`
- [ ] T061 [US3] Crear `src/app/api/agents/scraper/route.ts`: POST handler — verificar sesión, crear campaign, invocar `runLeadScraper` de forma asíncrona (no bloquea), retornar `{ jobStarted: true, campaignId }` inmediatamente (contracts/api-routes.md)
- [ ] T062 [US3] Agregar formulario de "Nueva campaña" en `src/app/(hub)/marketing/page.tsx`: modal con input de brief, target_count (max 200), selector de assigned_to; llama `POST /api/agents/scraper`; muestra `AgentProgressBar` con subscription Realtime a `campaigns` (FR-018, FR-021)

**Checkpoint**: US3 completa. Leads se crean manual o via scraper, aparecen en kanban, drag-and-drop funciona, filtros activos, dedup previene duplicados.

---

## Phase 6: User Story 4 — Enrichment automático con scoring (P1)

**Goal**: Agent clasifica cada lead `new` con score 0-100, reasoning 2-4 líneas, 3 dimensiones, en ≤5 min.

**Independent Test**: Insertar 5 leads `new` → dentro de 5 min los 5 están `enriched` con score, badge de color, reasoning visible. Verificar fallo graceful con `score=null` badge gris.

- [ ] T063 [US4] Crear `src/agents/enrichment.ts`: implementar `runEnrichment(input: EnrichmentInput)` completo según `contracts/agent-contracts.md` — verificar cap, llamar `anthropic.ts` con system prompt cacheado, validar output con Zod, UPDATE lead con score/dimensiones, INSERT `lead_history` (from: `new`, to: `enriched`), 3 reintentos con backoff (FR-023..FR-026)
- [ ] T064 [US4] Agregar Zod schemas `EnrichmentInputSchema` y `EnrichmentOutputSchema` en `src/types/agents.ts` con las 4 dimensiones de scoring y validación 0-100
- [ ] T065 [US4] Definir system prompt del Enrichment Agent en `src/agents/enrichment.ts`: criterios ManIAcos (score 70-100 / 40-69 / 0-39), sin texto adicional, JSON puro, `cache_control: ephemeral` en system block (R-007)
- [ ] T066 [US4] Crear `src/app/api/agents/enrichment/route.ts`: POST handler — acepta `leadId` o `batchAll: true`; carga leads `status='new'`; invoca `runEnrichment` secuencialmente con await; retorna `{ queued: N }` (contracts/api-routes.md)
- [ ] T067 [US4] Agregar trigger automático de enrichment en `src/app/api/leads/route.ts`: al crear lead `new` exitosamente, invocar `POST /api/agents/enrichment` en background (no await); esto implementa el requisito FR-023 "dentro de 5 min de creación"
- [ ] T068 [US4] Actualizar `src/components/hub/KanbanCard.tsx`: agregar skeleton loading mientras el enrichment corre (badge gris pulsante); actualizar via Realtime cuando `leads.score` cambia (FR-023)
- [ ] T069 [US4] Crear `src/components/hub/IncidentCard.tsx`: card para incidents sin resolver — agente, error, confidence, timestamp, botón "Resolver" con input de vault_lesson_url; se muestra en dashboard como "Atención requerida" (FR-026, Incident entity)

**Checkpoint**: US4 completa. Leads se enrichen automáticamente, scores visibles en kanban, fallo graceful con badge gris, incidents capturados.

---

## Phase 7: User Story 5 — Generación de drafts personalizados (P2)

**Goal**: Writer Agent genera drafts WA (<300 chars) o email por lead `enriched` con score≥40. Sin precios. Firma con nombre del socio.

**Independent Test**: 5 leads enriched score≥40 → ejecutar writer → 5 drafts `pending` en DB, texto personalizado por lead, sin palabras de precio, firmados con nombre correcto.

- [ ] T070 [US5] Crear `src/agents/writer.ts`: implementar `runWriter(input: WriterInput)` completo según `contracts/agent-contracts.md` — verificar cap, verificar `do_not_contact`, verificar `messages_sent_count` ≥2 (FR-082), llamar Claude con cache, validar Zod (incluye `containsPricing`), auto-regenerar si detecta precios (FR-083), calcular `draft_hash`, INSERT `drafts` status='pending'
- [ ] T071 [US5] Agregar Zod schemas `WriterInputSchema` y `WriterOutputSchema` en `src/types/agents.ts`; implementar función `containsPricing(text: string): boolean` que detecta `precio|costo|tarifa|inversión|\$|USD|ARS` (FR-083)
- [ ] T072 [US5] Definir system prompt del Writer Agent en `src/agents/writer.ts`: primera persona del socio firmante, WhatsApp ≤300 chars, email con asunto, personalización con observación específica, sin mención AI, sin precios, idioma según lead (FR-028..FR-032)
- [ ] T073 [US5] Crear `src/app/api/agents/writer/route.ts`: POST handler — acepta `leadIds[]` y `signedByUserId`; filtra leads con score≥40 y no en `do_not_contact`; invoca `runWriter` por cada lead; retorna `{ draftsCreated, draftsSkipped }` (contracts/api-routes.md)
- [ ] T074 [US5] Agregar botón "Generar drafts" en `src/app/(hub)/marketing/page.tsx`: selección múltiple de leads desde kanban → modal de confirmación con lead count y socio firmante → llama `POST /api/agents/writer` → toast con resultado (FR-028)
- [ ] T075 [US5] Agregar botón "Regenerar con otra angle" en `src/components/hub/LeadDetailPanel.tsx` cuando hay draft existente: llama writer con mismo leadId → nuevo `agent_runs` separado → nuevo draft pending reemplaza al anterior en la vista (FR-033)

**Checkpoint**: US5 completa. Drafts generados con personalización, sin precios, firmados correctamente, leads en do_not_contact ignorados.

---

## Phase 8: User Story 6 — Aprobación batch de drafts HITL (P2) 🔑 PRINCIPIO IV

**Goal**: Cola con swipe/atajos A/R/E/Spc/flechas, batch checkbox, 100 drafts en ≤10 min. Cero envíos sin aprobación.

**Independent Test**: Con 30 drafts pending, procesar usando solo teclado (A/R/E), aprobar 10 con batch checkbox, editar 3 inline. Verificar que todos quedan en DB con `approved_by` y diff si editados. Verificar idempotencia con doble-click.

- [ ] T076 [US6] Crear `src/hooks/useApprovalKeyboard.ts`: hook que registra listeners para `A` (aprobar), `R` (rechazar), `E` (editar), `Spc` (saltar), `←→` (navegar), `Shift+A` (aprobar todos visibles); retorna handlers para el approval queue (FR-036)
- [ ] T077 [US6] Crear `src/components/hub/DraftApprovalCard.tsx`: card fullscreen para un draft — contexto del lead arriba (nombre, score, canal), draft body editable (textarea), botones grandes Aprobar/Rechazar/Editar/Saltar con atajos visibles, badge "Lead caliente" si score≥85 (FR-035, FR-038)
- [ ] T078 [US6] Crear `src/components/hub/DraftApprovalQueue.tsx`: cola de aprobación — dos modos: (1) card fullscreen con swipe `framer-motion` + atajos teclado, (2) vista tabla con checkboxes para batch; contador `N/total`; `useApprovalKeyboard`; dialogo de confirmación para batch ≥5 items (FR-037, FR-040)
- [ ] T079 [US6] Crear `src/app/(hub)/marketing/approval/page.tsx`: Server Component que carga drafts `status='pending'` ordenados por `created_at`; renderiza `DraftApprovalQueue`; Realtime subscription para nuevos drafts que llegan mientras el usuario está en la cola
- [ ] T080 [US6] Crear `src/app/api/drafts/[draftId]/approve/route.ts`: PATCH handler idempotente — verificar si ya aprobado (retorna 200 sin duplicar), UPDATE `drafts` con `approved_by`, `approved_at`, `edited_diff` si body cambió (FR-034, FR-039, contracts/api-routes.md)
- [ ] T081 [P] [US6] Crear `src/app/api/drafts/[draftId]/reject/route.ts`: PATCH handler — UPDATE `drafts` status='rejected' con `rejection_reason` opcional (FR-038, contracts/api-routes.md)
- [ ] T082 [US6] Crear `src/app/api/drafts/batch-approve/route.ts`: POST handler — loop de hasta 100 draftIds, approve cada uno, retorna `{ approved, alreadyApproved, failed }`; idempotente (contracts/api-routes.md, FR-037)
- [ ] T083 [US6] Agregar link "Cola de aprobación (N pendientes)" en card Marketing del dashboard con badge contador; usar Realtime subscription en `drafts WHERE status='pending'` para actualizar el contador en tiempo real (FR-007, US2 integration)

**Checkpoint**: US6 completa. 100 drafts procesables en ≤10 min. Cero drafts pasan a `approved` sin `approved_by` registrado. Idempotencia verificada.

---

## Phase 9: User Story 7 — Envío de mensajes con rate limiting (P2)

**Goal**: Sender Agent despacha WA via Evolution y email via Resend. Rate limits (30 WA/h, 100 email/h), ventana horaria 9-21h, idempotencia, reintentos 3x.

**Independent Test**: Aprobar 5 WA drafts + 5 email → todos enviados en <5 min (ajustando por rate limit) → estado `sent` en DB → `evolution_message_id`/`resend_message_id` populados → intentar enviar mismo draft 2 veces → dedup previene duplicado.

- [ ] T084 [US7] Crear `src/agents/sender.ts`: implementar `runSender(input: SenderInput)` completo según `contracts/agent-contracts.md` — verificar cap (hard ceiling), verificar `do_not_contact`, verificar idempotencia por `draft_hash`, verificar rate limit, verificar quiet time 90s, verificar ventana horaria lead, enviar via `evolution.ts` o `resend.ts`, INSERT `messages`, UPDATE `leads.messages_sent_count++`, reintentos 3x con backoff (FR-041..FR-048, FR-081)
- [ ] T085 [US7] Agregar Zod schemas `SenderInputSchema` y `SenderOutputSchema` en `src/types/agents.ts`; implementar función `getLeadTimezone(pais: string): string` — default `America/Argentina/Buenos_Aires`; función `isInSendingWindow(timezone: string): boolean` verifica 9-21h local (FR-044)
- [ ] T086 [US7] Crear `src/app/api/agents/sender/route.ts`: POST handler — acepta `draftIds[]`; carga cada draft con su lead; invoca `runSender` secuencialmente; acumula resultados `{ sent, scheduled, failed }`; log en `agent_runs` por cada envío (contracts/api-routes.md)
- [ ] T087 [US7] Agregar trigger automático de sender tras aprobación: en `src/app/api/drafts/[draftId]/approve/route.ts` al aprobar, invocar `POST /api/agents/sender` con el draftId en background (no await); así el envío ocurre automáticamente post-aprobación (FR-034 flujo completo)
- [ ] T088 [US7] Crear `src/app/api/webhooks/resend-delivery/route.ts`: handler para webhooks de Resend delivery — validar Svix signature, mapear `email.delivered/bounced/complained` a `delivery_status`, UPDATE `messages`; si `complained` → INSERT `do_not_contact` (contracts/webhooks.md, R-013)
- [ ] T089 [US7] Actualizar `src/components/hub/KanbanCard.tsx` y `LeadDetailPanel.tsx`: mostrar estado de delivery (`queued/sent/delivered/failed/blocked`) en mensajes del lead; badge de alerta si `messages_sent_count ≥ 2` sin respuesta (FR-082)

**Checkpoint**: US7 completa. Mensajes enviados via Evolution/Resend, rate limits respetados, ventana horaria, idempotencia, delivery status actualizado via webhooks.

---

## Phase 10: User Story 8 — Reply Handler con clasificación y escalamiento (P2)

**Goal**: Clasificar replies WA/email en 5 categorías (confidence≥0.7), unsubscribe → do_not_contact automático, notificaciones in-Hub + Telegram.

**Independent Test**: Simular 5 replies con distintos tonos vía webhook de Evolution → clasificaciones correctas → `unsubscribe` mueve lead a `dead` e inserta en `do_not_contact` → `interested` notifica en Hub → confidence<0.7 va a `needs_human_review`.

- [ ] T090 [US8] Crear `src/agents/reply-handler.ts`: implementar `runReplyHandler(input: ReplyHandlerInput)` completo según `contracts/agent-contracts.md` — llamar Claude para clasificar, forzar `needs_human_review` si confidence<0.70, UPDATE `replies` con clasificación, procesar `unsubscribe` (INSERT `do_not_contact`, UPDATE lead `status='dead'`), notificar para `interested/question/objection` (FR-050..FR-054)
- [ ] T091 [US8] Agregar Zod schemas `ReplyHandlerInputSchema` y `ReplyHandlerOutputSchema` en `src/types/agents.ts`; implementar función `sendTelegramNotification(chatId, message)` usando Telegram Bot API (token en Vaultwarden); llamar si user tiene `telegram_chat_id` configurado (FR-088)
- [ ] T092 [US8] Crear `src/app/api/webhooks/evolution/route.ts`: handler completo según `contracts/webhooks.md` — validar header `apikey`, filtrar solo inbound (`fromMe=false`), dedup por `external_reply_id`, normalizar teléfono, buscar lead, INSERT `replies`, invocar `runReplyHandler` async (FR-049 WA)
- [ ] T093 [US8] Crear `src/app/api/webhooks/email-inbound/route.ts`: handler completo según `contracts/webhooks.md` — validar Bearer token, dedup por `messageId`, parsear `inReplyTo` para extraer Resend message ID, buscar `messages.resend_message_id`, INSERT `replies`, invocar `runReplyHandler` async (FR-049 email)
- [ ] T094 [US8] Implementar notificaciones in-Hub en `src/components/hub/CostChip.tsx` / layout: Supabase Realtime subscription en `replies WHERE classification='interested'` — badge contador en nav, toast "Nuevo reply de [lead.nombre]" con link al lead (FR-053)
- [ ] T095 [US8] Agregar sección "Replies pendientes" en `src/app/(hub)/marketing/page.tsx`: lista de replies con `classification='needs_human_review'` que necesitan acción humana; botón para reclasificar manualmente (FR-051, FR-054)

**Checkpoint**: US8 completa. Replies clasificados, unsubscribe procesado automáticamente, notificaciones activas. MVP comercial (P1+P2) funcional end-to-end.

---

## Phase 11: User Story 9 — Dashboard de métricas Marketing (P3)

**Goal**: Funnel completo con ratios, costo vs cap, ROI, top 10 oportunidades. Refresh cada 30s.

**Independent Test**: Con 100 leads en distintos estados y datos de costo en `cost_monthly_summary`, abrir `/marketing/analytics` → ver funnel con cantidades y ratios → costo con barra de progreso de color correcto → top 10 leads score≥80 sin contactar.

- [ ] T096 [US9] Crear `src/app/api/marketing/funnel/route.ts`: GET handler que calcula funnel — `SELECT status, COUNT(*) FROM leads GROUP BY status` + ratios entre etapas; incluir `deal_value_usd` SUM para `status='closed'` (ROI)
- [ ] T097 [P] [US9] Crear `src/app/api/marketing/top-leads/route.ts`: GET handler — leads con score≥80 y `status IN ('new','enriched')` sin mensajes enviados, ordenados por score desc, limit 10
- [ ] T098 [US9] Crear `src/app/(hub)/marketing/analytics/page.tsx`: Client Component con auto-refresh 30s (FR-059); renderiza funnel visual (barras horizontales con ratios), `CostChip` breakdown expandido, ROI card (revenue/costo), top 10 leads con CTA "Generar drafts" (FR-055..FR-058)
- [ ] T099 [P] [US9] Crear componente `src/components/hub/FunnelChart.tsx`: barras horizontales para cada etapa del funnel con conteos absolutos y ratio vs etapa anterior; colores graduados por conversion rate
- [ ] T100 [P] [US9] Crear componente `src/components/hub/RoiCard.tsx`: card con costo del mes, revenue cerrado (SUM `deal_value_usd` WHERE `closed_at` en el mes), ROI calculado; input manual para registrar deal value en leads cerrados

**Checkpoint**: US9 completa. Métricas actualizadas cada 30s, funnel visible, ROI calculado, top oportunidades con CTA.

---

## Phase 12: User Story 10 — Vault UI (P3)

**Goal**: Editor markdown con preview, wikilinks resolubles, búsqueda full-text, árbol de archivos, auto-sync git en ≤30s, detección de conflictos.

**Independent Test**: Noe crea nota "Reunion Hotel Plaza" desde UI → en ≤30s existe en repo git con commit `noe <noe@maniaco.online>` → otro miembro abre la misma nota → edición simultánea → ver merge view.

- [ ] T101 [US10] Crear `src/lib/vault-sync.ts`: función `syncVaultNote({ filePath, content, author, email })` que llama al vault-write API en Oracle ARM (`VAULT_API_URL`) via HTTP POST; retorna `{ commitHash }` o lanza error con retry 3x (R-006)
- [ ] T102 [US10] Crear `src/app/api/vault/save/route.ts`: POST handler — upsert `vault_notes` en Postgres (índice búsqueda), invocar `syncVaultNote`, UPDATE `git_commit_hash`; usar `session.user.email` como author (contracts/api-routes.md, FR-061)
- [ ] T103 [US10] Crear `src/app/api/vault/search/route.ts`: GET handler — query `tsvector` en `vault_notes` con `ts_headline` para snippets; retorna top 20 resultados rankeados (contracts/api-routes.md, FR-063, R-014)
- [ ] T104 [US10] Crear `src/components/hub/VaultFileTree.tsx`: panel izquierdo con árbol de carpetas (`clientes/decisiones/lessons-learned/specs/sesiones/`); lista archivos desde `vault_notes.file_path`; click navega al archivo; botón "Nueva nota" con modal para path y título (FR-060)
- [ ] T105 [US10] Crear `src/components/hub/VaultEditor.tsx`: editor split-view — izq CodeMirror markdown, der preview con `remark-html` + plugin de wikilinks `[[nombre]]` → `<a href="/vault/nombre">`; Ctrl+S guarda llamando `POST /api/vault/save`; debounce 2s para auto-save (FR-060, FR-062, R-014)
- [ ] T106 [US10] Crear `src/app/(hub)/vault/page.tsx`: layout 3 paneles — `VaultFileTree` izq, `VaultEditor` centro, panel der con backlinks (query `vault_notes` buscando el filename actual) y tags; barra de búsqueda global llama `GET /api/vault/search` (FR-063, FR-064)
- [ ] T107 [US10] Implementar detección de conflictos en `src/app/api/vault/save/route.ts`: si `vault_notes.last_edited_at` del request es anterior al `last_edited_at` en DB, retornar 409 con `{ conflict: true, serverContent: string }`; front-end muestra merge view side-by-side (FR-064)

**Checkpoint**: US10 completa. Editor funcional, notas se sincronizan a git, wikilinks clickeables, búsqueda full-text, conflictos detectados.

---

## Phase 13: User Story 11 — Agent Coordinator (P3)

**Goal**: Chat en lenguaje natural → plan paso a paso → confirmación humana → ejecución orquestada → estado persistente post-refresh.

**Independent Test**: Escribir "Scrapea 10 ferreterías en Rosario, enriquecelas y dejame los drafts listos" → ver plan con 3 pasos → confirmar → progreso paso a paso → 10 leads + enrichment + drafts en DB → intentar enviar mensajes → PARAR y pedir aprobación.

- [ ] T108 [US11] Crear `supabase/migrations/0004_coordinator_sessions.sql`: tabla `coordinator_sessions` con `(id uuid PK, user_id uuid, request text, plan jsonb, status text, current_step int, created_at, updated_at)` para persistencia de estado (FR-069)
- [ ] T109 [US11] Crear `src/agents/coordinator.ts`: implementar `parsePlanWithLLM(request: string, supabase)` usando Claude Opus — sistema prompt que parsea lenguaje natural a `CoordinatorPlan` Zod-validated; función `executeStep(step, supabase)` que llama al agente correcto (scraper/enrichment/writer) por nombre según `contracts/agent-contracts.md` (R-009)
- [ ] T110 [US11] Agregar Zod schema `CoordinatorPlanSchema` con `steps[]` (stepNumber, agentName, description, params, requiresHumanApproval) en `src/types/agents.ts` (contracts/agent-contracts.md)
- [ ] T111 [US11] Crear `src/app/api/agents/coordinator/route.ts`: POST handler con Server-Sent Events (streaming) — parsear plan, stream evento `type:'plan'`, esperar confirmación via `coordinator_sessions.status='confirmed'`, ejecutar steps streameando `type:'step_start/progress/complete'`, detener en `requiresHumanApproval` con `type:'approval_required'` (FR-066..FR-068, contracts/api-routes.md)
- [ ] T112 [US11] Crear `src/components/hub/CoordinatorChat.tsx`: interfaz chat — input de texto, botón enviar, stream de eventos SSE renderizado como mensajes (plan como lista numbered, progreso como loading steps, errores con opciones Reintentar/Skip/Abortar); estado persistido via `coordinator_sessions`; Realtime subscription para reanudar tras refresh (FR-065, FR-069, FR-070)
- [ ] T113 [US11] Crear `src/app/(hub)/coordinator/page.tsx`: page que renderiza `CoordinatorChat`; link a historial de sesiones anteriores; límite visible de cost cap en el contexto del chat (FR-065)

**Checkpoint**: US11 completa. Coordinator funciona en lenguaje natural, estado persiste, HITL forzado antes de cualquier envío.

---

## Phase 14: Polish, WhatsApp Health Monitor y Smoke Tests E2E

**Purpose**: WA health score, empty states, smoke tests Playwright obligatorios pre-deploy, cleanup final.

### WhatsApp Health Monitor

- [ ] T114 Crear `src/lib/whatsapp-health.ts`: función `calculateHealthScore({ deliveryRate, responseRate }): number` con fórmula `rate * 0.6 + response * 0.4`; función `isHealthAlertNeeded(score, spamReports): boolean` (score < 0.5 OR spamReports ≥ 3) (FR-080, R-010)
- [ ] T115 Crear `src/app/api/webhooks/whatsapp-health-alert/route.ts`: POST handler — validar `X-Internal-Secret`, INSERT `whatsapp_health`, si `alert=true` INSERT `incidents` con `agent_name='whatsapp_health_monitor'` (contracts/webhooks.md)
- [ ] T116 Agregar card de salud WA en `src/app/(hub)/dashboard/page.tsx`: score actual con semáforo (verde ≥0.7, amarillo 0.5-0.69, rojo <0.5); último medido at; link a historial en `whatsapp_health` (FR-080)

### Empty states

- [ ] T117 [P] Agregar empty states en `src/app/(hub)/marketing/page.tsx`: kanban vacío → "No hay leads — [Scrapear con IA] o [+ Agregar manual]" (FR-087)
- [ ] T118 [P] Agregar empty state en `src/app/(hub)/marketing/approval/page.tsx`: cola vacía → "Todo aprobado ✓" con emoji checkmark (FR-087)
- [ ] T119 [P] Agregar empty state en `src/app/(hub)/marketing/analytics/page.tsx`: sin datos → "Crea tu primera campaña para ver métricas aquí" con CTA a `/marketing` (FR-087)

### Pre-commit hook de atribución

- [ ] T120 Crear `.git/hooks/pre-commit` (script bash): buscar strings prohibidas (`Co-Authored-By: Claude|Generated with Claude|🤖 Generated`) en mensajes de commit y archivos staged; abort con mensaje de error si encuentra alguna (FR-078)

### Smoke Tests Playwright (obligatorios pre-deploy — constitution)

- [ ] T121 Crear `tests/e2e/auth.spec.ts`: test "login magic link y logout" — navegar a `/login`, ingresar email local, interceptar Supabase auth en Inbucket, hacer click en magic link, verificar redirect a `/dashboard`, hacer logout, verificar redirect a `/login` (Smoke 1)
- [ ] T122 Crear `tests/e2e/lead.spec.ts`: test "crear lead manual y ver en kanban" — login, navegar a `/marketing`, click "+ Agregar manual", fill formulario, submit, verificar lead aparece en columna `new` del kanban (Smoke 2)
- [ ] T123 Crear `tests/e2e/outreach.spec.ts`: test "aprobar draft y verificar llamada a Evolution (mock)" — crear lead + draft via DB seed, navegar a `/marketing/approval`, aprobar con tecla `A`, verificar draft pasa a `approved` en DB; mock de Evolution API con `page.route()` (Smoke 3)
- [ ] T124 Crear `tests/e2e/dashboard.spec.ts`: test "load dashboard con métricas mock" — login, navegar a `/dashboard`, verificar 6 cards visibles sin scroll en viewport 1280x800, CostChip visible en header (Smoke 4)
- [ ] T125 Crear `tests/e2e/vault.spec.ts`: test "crear nota y verificar persistencia" — login, navegar a `/vault`, click "Nueva nota", crear nota "Test Smoke", guardar, reload, verificar nota sigue visible con contenido correcto (Smoke 5)

### Deploy y CI

- [ ] T126 Configurar Vercel project en `vercel.json`: env vars desde Vaultwarden (documentadas en `quickstart.md`), branch `master` como production, `001-hub-marketing-v1` como preview; comando de build `bun run build`
- [ ] T127 Configurar GitHub Actions en `.github/workflows/smoke-tests.yml`: trigger en push a `master`, job que corre los 5 smoke tests de Playwright contra URL de preview de Vercel antes de promover a producción
- [ ] T128 Actualizar `RESUME_HERE.md` marcando Fase 5 completada, estado listo para `/speckit-taskstoissues`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: Sin dependencias — empezar inmediatamente
- **Phase 2 (Foundation)**: Depende de Phase 1 — **BLOQUEA todas las User Stories**
- **Phase 3 (US1)**: Depende de Phase 2 únicamente
- **Phase 4 (US2)**: Depende de Phase 2; se beneficia de US1 completa
- **Phase 5 (US3)**: Depende de Phase 2; puede correr en paralelo con US1/US2
- **Phase 6 (US4)**: Depende de US3 (necesita leads `new` para enricher)
- **Phase 7 (US5)**: Depende de US4 (necesita leads `enriched` con score)
- **Phase 8 (US6)**: Depende de US5 (necesita drafts `pending`)
- **Phase 9 (US7)**: Depende de US6 (necesita drafts `approved`)
- **Phase 10 (US8)**: Depende de US7 (necesita mensajes enviados para recibir replies)
- **Phase 11 (US9)**: Depende de US3-US8 completas (dashboard necesita datos del pipeline)
- **Phase 12 (US10)**: Depende de Phase 2 únicamente — puede correrse en paralelo con US3-US8
- **Phase 13 (US11)**: Depende de US3-US7 (orquesta esos agentes)
- **Phase 14 (Polish)**: Depende de todas las US deseadas completadas

### Cadena crítica del pipeline de marketing
```
Setup → Foundation → US1/US2 (paralelo) → US3 → US4 → US5 → US6 → US7 → US8
                                         ↓
                                      US10 (vault — paralelo independiente)
```

### Parallel Opportunities

```bash
# Phase 1 — todo en paralelo:
T002, T003, T004, T005, T006, T007, T008, T009, T010, T011, T012

# Phase 2 — libs en paralelo (bloqueante: T013-T022 deben ir primero):
T023-T025 (supabase clients), T027-T033 (libs integración), T034-T038 (cost system)

# US1 + US2 corren en paralelo después de Foundation:
[T040-T043] || [T044-T049]

# US10 (Vault) corre en paralelo con US3-US8:
[T050-T095] || [T101-T107]
```

---

## Parallel Example: US6 (Approval Queue)

```
# Correr en paralelo:
T076 src/hooks/useApprovalKeyboard.ts
T077 src/components/hub/DraftApprovalCard.tsx
T081 src/app/api/drafts/[draftId]/reject/route.ts

# Secuencial después de T076+T077:
T078 src/components/hub/DraftApprovalQueue.tsx (depende de T076, T077)
T079 src/app/(hub)/marketing/approval/page.tsx (depende de T078)
T080 src/app/api/drafts/[draftId]/approve/route.ts
T082 src/app/api/drafts/batch-approve/route.ts (depende de T080)
```

---

## Implementation Strategy

### MVP Absoluto (US1-US2 — Sprint 1 completo)

1. Phase 1: Setup
2. Phase 2: Foundation
3. US1: Login + auth
4. US2: Dashboard shell
5. **VALIDAR**: login funcional, dashboard visible, CostChip en header

### MVP Funcional (US1-US4 — fin Sprint 2)

1. Sumar US3: Kanban + Lead Scraper
2. Sumar US4: Enrichment Agent
3. **VALIDAR** con Noe: scrapear leads, verlos con score en kanban (SC-001 parcial)

### MVP Comercial (US1-US8 — fin Sprint 4)

1. Sumar US5-US6: Writer + Approval Queue HITL
2. Sumar US7-US8: Sender + Reply Handler
3. **VALIDAR**: flujo end-to-end completo, primer outreach real a lead de prueba

### MVP Completo (US1-US11 — fin Sprint 5)

1. Sumar US9: Dashboard Marketing
2. Sumar US10: Vault UI
3. Sumar US11: Coordinator
4. Phase 14: Polish + 5 Smoke Tests
5. **DEPLOY** a `hub.maniaco.online`

---

## Notes

- `[P]` = archivo diferente, sin dependencias incompletas — lanzar como tareas paralelas en Claude Code
- Cada tarea tiene path exacto — Claude Code puede ejecutarla sin contexto adicional
- No hay test tasks (TDD) excepto los 5 smoke tests Playwright (obligatorios por constitution)
- Commit después de cada checkpoint de fase — nunca acumular más de 1 fase sin commitear
- Pre-commit hook (T120) debe instalarse antes del primer commit de código
- Verificar `bun run typecheck` (tsc --noEmit) al final de cada fase
- Respetar Principio III en cada commit: sin Co-Authored-By Claude, sin footers AI
