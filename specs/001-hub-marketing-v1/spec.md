# Feature Specification: Hub ManIAcos V1 — Departamento Marketing

**Feature Branch**: `001-hub-marketing-v1`

**Created**: 2026-05-24

**Status**: Draft

**Input**: User description: "Hub ManIAcos producto interno V1 con foco en departamento Marketing — lead scraping, enrichment, outreach con HITL completo, vault sync, dashboards, agent coordinator"

## User Scenarios & Testing

### User Story 1 — Login y entrada al Hub (Priority: P1) MVP-ABSOLUTO

Como miembro del equipo ManIAcos (Franco, Lucho o Noe) accedo a `hub.maniaco.online`, me autentico con magic link enviado a mi mail `@maniaco.online`, completo TOTP si esta configurado, y aterrizo en el dashboard general en menos de 10 segundos desde que escribi la URL.

**Why this priority**: sin login confiable no existe Hub. Esta US es la puerta de entrada para todas las demas. Tambien es la primera validacion de "time-to-vibe <10s" del principio de Constraints.

**Independent Test**: cualquier miembro del equipo recibe la URL, abre el browser, ingresa su mail `@maniaco.online`, hace click en el magic link recibido, y ve el dashboard. Tiempo total esperado: <30 segundos (incluyendo latencia de mail).

**Acceptance Scenarios**:

1. **Given** Franco abre `hub.maniaco.online` en Chrome sin sesion activa, **When** ingresa `franco@maniaco.online` y solicita magic link, **Then** recibe el mail en <30s y al hacer click es redirigido al dashboard general con su nombre visible en el header.
2. **Given** un usuario malicioso ingresa un mail externo (`hacker@gmail.com`), **When** solicita magic link, **Then** el sistema responde con error explicito "Solo dominios `@maniaco.online` autorizados" sin enviar mail.
3. **Given** Lucho ya tiene sesion activa de hace 2 dias, **When** abre `hub.maniaco.online`, **Then** entra directo al dashboard sin re-autenticarse.
4. **Given** Noe hace click en "Cerrar sesion" en el header, **When** intenta volver al Hub, **Then** ve la pantalla de login.

---

### User Story 2 — Dashboard general con estado de departamentos (Priority: P1)

Como miembro del equipo veo en una sola pantalla el estado de salud y los KPIs principales de cada departamento del Hub, la actividad reciente del equipo cross-departamento, y quien esta conectado en ese momento. La pantalla carga en menos de 2 segundos.

**Why this priority**: el dashboard es el "home" del Hub. Sin esta vista cohesiva, los miembros no saben donde estan parados ni que necesita atencion.

**Independent Test**: con datos seed en la base, abrir el Hub post-login muestra cards de "Marketing", "Sales" (con badge "V2"), "Operations" (badge "V2"), "Finance" (badge "V3"), "Vault", "Coordinator", cada una con su KPI principal (ej: Marketing muestra "12 leads pendientes de aprobacion"). Tambien lista las ultimas 10 acciones del equipo y avatars de socios conectados ahora.

**Acceptance Scenarios**:

1. **Given** hay 12 drafts de outreach pendientes de aprobacion, 3 leads nuevos scrapeados hoy, y Franco esta conectado, **When** Lucho abre el dashboard, **Then** ve la card de Marketing con "12 drafts pendientes" como CTA destacado y avatar de Franco con dot verde "online".
2. **Given** todos los departamentos V2/V3 estan desactivados, **When** Noe abre el dashboard, **Then** ve las cards de esos departamentos con badge "Disponible en V2" o "V3" y CTA deshabilitado pero visible (no las oculta).
3. **Given** el dashboard carga, **When** mido el tiempo entre el primer paint y la carga completa de las cards con datos reales, **Then** es <2 segundos en conexion >=10 Mbps.

---

### User Story 3 — Captura y visualizacion de leads (Priority: P1)

Como miembro del equipo agrego leads al pipeline de Marketing — manualmente (uno por uno con formulario) o por lote via Lead Scraper desde Google Maps. Los veo en una vista kanban con estados (`new`, `enriched`, `contacted`, `replied`, `qualified`, `closed`, `dead`). Puedo filtrar por industria, ciudad, score, y status.

**Why this priority**: sin leads no hay pipeline ni outreach. Esta US habilita el flujo entero de Marketing. Es la primera donde aparece un agente IA (Lead Scraper).

**Independent Test**: Franco ingresa un brief al Lead Scraper ("ferreterias en Rosario con >5 empleados, 20 leads"). El sistema scrapea Google Maps, devuelve 20 leads con datos basicos (nombre, telefono, direccion, sitio web si tiene). Aparecen en la columna `new` del kanban. Franco puede arrastrarlos manualmente entre columnas o agregar uno mas con un boton "+ Nuevo lead".

**Acceptance Scenarios**:

1. **Given** Franco ingresa el brief "panaderias en Cordoba con horario corrido, 15 leads", **When** dispara el Lead Scraper, **Then** dentro de 3 minutos aparecen hasta 15 nuevos registros en columna `new` con campos `nombre, telefono, direccion, ciudad, industria, fuente='google_maps'` y `created_by='lead_scraper'`.
2. **Given** un scraping arroja 3 leads que ya existen en DB (mismo telefono o URL), **When** se procesan los resultados, **Then** los duplicados NO se insertan; el sistema reporta "12 nuevos, 3 ya existian".
3. **Given** hay 50 leads en distintos estados, **When** Noe filtra por "industria=panaderias" y "ciudad=Cordoba", **Then** la vista muestra solo los matching y el contador del kanban actualiza por columna.
4. **Given** Lucho hace click en un lead, **When** se abre el panel de detalle, **Then** ve toda la informacion del lead, su historial de acciones (con timestamp y autor humano), y los drafts/mensajes asociados.
5. **Given** el Lead Scraper esta corriendo, **When** Franco refresca la pagina antes de que termine, **Then** ve el progreso como "Scrapeando: 7/15 completados" en lugar de error.

---

### User Story 4 — Enrichment automatico de leads con scoring (Priority: P1)

Cuando entra un lead `new` al sistema, un agente IA lo analiza automaticamente: clasifica industria/tamaño/fit con nosotros, le asigna un score 0-100, y lo deja en estado `enriched`. El miembro ve el score como badge de color (verde >=70, amarillo 40-69, rojo <40) y puede leer el razonamiento del agente en un tooltip o panel lateral.

**Why this priority**: sin scoring, el outreach gasta esfuerzo en leads malos. Esta US convierte el lead crudo en lead accionable. Es la primera prueba real de un agente IA "pensar puro" (sin side effects externos).

**Independent Test**: al insertar 10 leads `new` (manual o via scraper), dentro de 5 minutos los 10 quedan en estado `enriched` con score numerico, badge de color, y reasoning textual de 2-3 lineas accesible por click.

**Acceptance Scenarios**:

1. **Given** entra al pipeline un lead "Panaderia La Esquina, 2 empleados, sin sitio web", **When** el Enrichment Agent lo procesa, **Then** queda con score `<40`, badge rojo, y reasoning "negocio muy chico sin presencia digital — fit bajo con ManIAcos".
2. **Given** entra "Hotel Plaza Cordoba SA, 50 empleados, sitio web con booking online", **When** el agente lo procesa, **Then** queda con score `>=70`, badge verde, reasoning "empresa mediana con stack digital — alto potencial para automatizacion AI".
3. **Given** el Enrichment Agent falla por timeout o error de API, **When** se reintenta automaticamente, **Then** maximo 3 reintentos con backoff exponencial; si todos fallan, lead queda con `status='enriched'` pero `score=null` y badge gris "Sin clasificar — reintentar manualmente".
4. **Given** el costo acumulado del Enrichment Agent este mes supera el soft cap, **When** entra un lead nuevo, **Then** el agente sigue procesando (es soft cap) pero registra el run con flag `over_cap=true` para el dashboard.
5. **Given** Noe disagree con el score de un lead, **When** click en el badge, **Then** ve un boton "Override score" que le permite ajustar manualmente con motivo textual (queda loggeado en `agent_runs.human_approved_by`).

---

### User Story 5 — Generacion de drafts de outreach personalizados (Priority: P2)

Para cada lead en estado `enriched` con `score>=40` (configurable), un agente IA genera un draft de mensaje de outreach personalizado: en WhatsApp (formato corto, <300 chars) o email (formato largo con asunto), segun el canal preferido del lead. El draft usa la info enriquecida (industria, tamaño, valor inferido) y mantiene tono ManIAcos (informal-profesional, primera persona del socio asignado, sin atribucion AI).

**Why this priority**: sin drafts personalizados no hay outreach que convierta. Esta US es la pieza central del valor que ManIAcos vende: outreach humano amplificado por IA.

**Independent Test**: con 5 leads `enriched` score>=40, disparar la generacion de drafts. Dentro de 2 minutos hay 5 drafts en estado `draft_pending` con texto personalizado por lead, canal correcto (whatsapp o email), y socio firmante asignado. Cada draft expone su input al agente y permite editar antes de aprobar.

**Acceptance Scenarios**:

1. **Given** un lead "Hotel Plaza Cordoba SA, score 85, channel=whatsapp, asignado a franco", **When** se dispara el Writer Agent, **Then** genera un draft <300 chars con el formato "Hola [nombre contacto], soy Franco de ManIAcos, vi que [observacion especifica del Hotel Plaza]. Trabajamos con hoteles automatizando [valor inferido]. ¿15 min de charla?" — sin firma AI.
2. **Given** un lead "Estudio Contable Lopez, score 72, channel=email, asignado a lucho", **When** se genera el draft, **Then** incluye asunto + cuerpo con tono profesional, primera persona de Lucho, sin atribucion a Claude/AI en el contenido NI en metadata del mail.
3. **Given** un draft ya generado, **When** el socio hace click "Regenerar con otra angle", **Then** el agente produce un draft alternativo (no idempotente porque hay flag explicito) registrado como `agent_runs` separado.
4. **Given** Franco edita un draft antes de aprobar, **When** guarda, **Then** la version editada queda como autoritativa con `last_edited_by=franco` y el draft original se preserva en `agent_runs.output_payload`.
5. **Given** el lead esta en idioma no-español (ej: sitio web en ingles), **When** se genera el draft, **Then** se genera en el idioma del lead, marcado con `language='en'`.

---

### User Story 6 — Aprobacion batch de drafts con UX rapida (Priority: P2) PRINCIPIO IV CRITICO

En una vista dedicada veo todos los drafts pendientes de aprobacion (cola unica cross-canal). Puedo procesarlos a velocidad: swipe right para aprobar, left para rechazar, doble-tap o tecla `E` para editar inline, atajos de teclado `A`/`R`/`E`. Puedo seleccionar varios con checkbox y aprobar/rechazar en masa. La meta es que un socio procese **100 drafts en <=10 minutos** (6 segundos por decision).

**Why this priority**: esta es la implementacion del Principio IV "Human-in-the-Loop". Si la aprobacion es lenta, el equipo no escala outreach. Friction de 1 click por draft = OK; friction de 5 clicks por draft = bloqueante para hacer 100+/dia.

**Independent Test**: con 30 drafts pendientes, un socio entra a la cola, procesa los 30 (algunos aprueba, otros rechaza, edita 3, batch-aprueba 10) y termina en <=3 minutos. Cada decision queda loggeada con `approved_by`, `decision`, `timestamp`, y diff si edito.

**Acceptance Scenarios**:

1. **Given** hay 50 drafts pendientes, **When** Franco entra a la cola, **Then** ve el primer draft en pantalla completa con lead context arriba, draft editable abajo, contador "1/50", y botones grandes "Aprobar (A)" / "Rechazar (R)" / "Editar (E)" / "Saltar (Spc)".
2. **Given** Franco presiona `A`, **When** el sistema procesa, **Then** el draft pasa a `approved` con `approved_by=franco` + `approved_at=now()`, y avanza automaticamente al draft 2/50 sin reload.
3. **Given** Lucho seleccionar 8 drafts con checkbox en vista de tabla, **When** presiona "Aprobar seleccionados", **Then** los 8 pasan a `approved` con un dialogo de confirmacion "Vas a aprobar 8 drafts. ¿Confirmar?" para evitar accidentes.
4. **Given** un draft tiene score del lead muy alto (>=85), **When** Noe lo procesa, **Then** ve un badge "Lead caliente" recordandole prestar mas atencion.
5. **Given** Franco rechaza un draft con tecla `R`, **When** confirma el rechazo, **Then** opcionalmente puede tipear un motivo (1-2 palabras) que queda guardado en `rejection_reason` para feedback al Writer Agent.
6. **Given** un draft fue aprobado, **When** se intenta aprobarlo de nuevo (race condition de doble click), **Then** el sistema responde idempotentemente sin duplicar (Principio IX).

---

### User Story 7 — Envio de mensajes aprobados con rate limiting (Priority: P2)

Una vez aprobado, un draft pasa automaticamente al Sender Agent que lo despacha por el canal correcto: WhatsApp via Evolution API self-hosted, o email via Resend. El envio respeta rate limits configurables (default: 30 WhatsApp/hora, 100 emails/hora, max 200 mensajes salientes/dia total). El mensaje se envia "manana entre 9-12h" si la aprobacion ocurre fuera de ventana horaria del lead.

**Why this priority**: sin envio real, todo lo anterior es ejercicio. Esta US convierte aprobacion en accion comercial.

**Independent Test**: aprobar 5 drafts WhatsApp + 5 email. Dentro de 5 minutos (ajustando por rate limit) los 10 quedan en estado `sent` con `sent_at` poblado, y se reciben efectivamente en los telefonos/inboxes de prueba.

**Acceptance Scenarios**:

1. **Given** Franco aprueba un draft WhatsApp a las 14:35, **When** el Sender Agent lo procesa, **Then** envia via Evolution API dentro de 30s, marca `sent_at=now()`, y registra el `whatsapp_message_id` retornado por Evolution.
2. **Given** se enviaron ya 30 WhatsApp en la ultima hora, **When** entra un draft aprobado nuevo, **Then** queda en cola `queued_for_send` con `scheduled_for=<proximo slot disponible>`.
3. **Given** Lucho aprueba un draft a las 23:50 hora local del lead, **When** el Sender lo procesa, **Then** lo programa para enviar al dia siguiente entre 9:00 y 12:00 hora del lead (no envia de madrugada).
4. **Given** Evolution API esta caida, **When** el Sender intenta enviar, **Then** reintenta 3 veces con backoff (30s, 2min, 10min), y si todas fallan deja el draft en `send_failed` con motivo y notifica al equipo via card en dashboard.
5. **Given** se alcanza el hard ceiling de costo $400/mes, **When** entra un envio, **Then** se bloquea con error "Hard cap alcanzado — desbloqueo manual con 2 socios" (Principio VI).
6. **Given** un mismo lead recibe segundo intento por error operacional (idempotencia), **When** se procesa el envio, **Then** se detecta por `(lead_id, draft_hash)` y NO se envia doble (Principio IX).

---

### User Story 8 — Reply Handler con escalamiento a humano (Priority: P2)

Cuando un lead responde a un mensaje saliente (sea WhatsApp o email), el Reply Handler Agent clasifica automaticamente la respuesta en una de 5 categorias: `interested`, `question`, `objection`, `not_interested`, `unsubscribe`. Las primeras 4 escalan a humano (notificacion en Hub + opcional Telegram); `unsubscribe` se procesa solo (marca lead como `dead` y NO permite reenvio futuro).

**Why this priority**: sin handler de replies, las respuestas se pierden y el outreach se vuelve mala UX para el lead.

**Independent Test**: simular 5 respuestas con distintos tonos (positiva, pregunta, negativa, no me molesten, ambigua). El sistema clasifica las 5 correctamente, notifica al socio asignado al lead, y mueve estado del lead segun corresponda.

**Acceptance Scenarios**:

1. **Given** un lead responde "Me interesa, contame mas", **When** el Reply Handler procesa, **Then** clasifica como `interested`, mueve lead a `status='replied'`, y crea notificacion para socio asignado.
2. **Given** un lead responde "No me molesten mas", **When** el handler procesa, **Then** clasifica como `unsubscribe`, marca lead como `dead`, agrega a `do_not_contact` (tabla blacklist), y NO genera notificacion al socio.
3. **Given** un lead responde "Cuanto cuesta?", **When** el handler procesa, **Then** clasifica como `question`, deja respuesta pendiente de atencion humana con badge "Pregunta — responder tu mismo".
4. **Given** el handler no logra clasificar con confianza (>0.7), **When** ocurre, **Then** marca como `needs_human_review` y notifica al socio asignado.
5. **Given** el lead responde por canal distinto al original (envie WhatsApp, responde email), **When** el handler recibe ambos canales, **Then** consolida la conversacion bajo el mismo `lead_id`.

---

### User Story 9 — Dashboard de metricas Marketing (Priority: P3)

Un dashboard especifico del departamento Marketing muestra: funnel total (leads `new` → `enriched` → `approved` → `sent` → `replied` → `qualified` → `closed`), tasa de conversion entre cada etapa, costo total del mes (agentes IA + Resend + otros), ROI estimado (revenue cerrado del mes / costo del mes), y top 10 leads por score sin contactar.

**Why this priority**: sin metricas no hay learning loop. P3 porque las primeras US ya entregan valor; metricas vienen despues del flujo completo.

**Independent Test**: con 100+ leads en distintos estados y 30 dias de historico simulado, el dashboard muestra todas las metricas correctamente actualizadas en tiempo real (refresh cada 30s).

**Acceptance Scenarios**:

1. **Given** hay 100 leads `new`, 60 `enriched`, 40 `approved`, 35 `sent`, 8 `replied`, 3 `qualified`, 1 `closed`, **When** Lucho abre el dashboard de Marketing, **Then** ve el funnel con esas cantidades + ratios calculados (60% new→enriched, 67% enriched→approved, etc.).
2. **Given** el costo del mes es $162 ($80 Claude + $60 Resend + $22 otros), **When** Franco abre el dashboard, **Then** ve "Costo este mes: $162 / $200 soft cap (81%)" con barra de progreso roja (cruzo el 70% umbral amarillo). El banner amarillo se activó cuando llegó a $140.
3. **Given** se cerro 1 deal este mes por $1500 setup + $800 MRR estimado, **When** Noe abre el dashboard, **Then** ve "ROI mes: $2300 cerrados / $342 costo = 6.7x" como KPI destacado.
4. **Given** hay 12 leads con score>=80 sin contactar, **When** se abre el dashboard, **Then** ve "Top oportunidades pendientes" listadas con CTA "Generar drafts ahora".

---

### User Story 10 — Vault: notas markdown auto-versionadas (Priority: P3)

Cualquier miembro crea, edita y consulta notas markdown del vault desde una UI tipo Obsidian-light: panel izquierdo arbol de carpetas (`clientes/`, `decisiones/`, `lessons-learned/`, `specs/`, `sesiones/`), panel central editor markdown con preview, panel derecho backlinks/tags. Las notas se sincronizan automaticamente al repo git `ManIAco-org/vault` sin intervencion manual.

**Why this priority**: vault es transversal pero su UI completa puede esperar a Sprint 4. Las notas pueden ya estar siendo creadas por Claude via hooks aunque la UI del Hub no este lista.

**Independent Test**: Noe crea una nota "Reunion con Hotel Plaza" desde la UI. Despues de 30s, la nota existe como archivo `.md` en el repo git `vault` con commit autoria de Noe. Otro miembro abre la misma nota desde su Hub y la ve identica.

**Acceptance Scenarios**:

1. **Given** Noe crea una nota nueva con titulo "Lessons del lanzamiento RC", **When** guarda con Ctrl+S, **Then** dentro de 30s se commitea al repo `vault` en `lessons-learned/2026-05-24-rc-launch.md` con autor `noe <noe@maniaco.online>`, mensaje plano sin atribucion AI.
2. **Given** Franco edita la misma nota desde otro device, **When** guarda, **Then** el sistema detecta conflicto si Noe edito en simultaneo y ofrece merge view (no machaca cambios).
3. **Given** una nota contiene `[[cliente-rc-repuestos]]`, **When** se renderiza el preview, **Then** el wikilink resuelve al archivo `clientes/rc-repuestos.md` con click.
4. **Given** Lucho busca "outreach", **When** ingresa el query en la barra global, **Then** ve las notas que mencionan esa palabra ordenadas por relevancia.

---

### User Story 11 — Agent Coordinator (chat orchestrator) (Priority: P3)

Una vista chat-like donde un miembro escribe lo que necesita en lenguaje natural ("scrapeame 30 ferreterias en Cordoba, enriquecelos, generame drafts pero NO los aprueb es") y el Agent Coordinator decompone el pedido en llamadas a agentes especializados (Lead Scraper, Enrichment, Writer), reporta progreso paso a paso, y deja todo listo para revision humana.

**Why this priority**: el Coordinator es "nice to have" V1. Las US 3-7 ya permiten operar manualmente disparando agentes uno a uno. El Coordinator es la cereza que automatiza el flujo completo.

**Independent Test**: Franco escribe en el chat "Genera 20 leads de panaderias en Cordoba, enriquecelos y dejame los drafts listos para aprobar". El Coordinator: (1) llama Lead Scraper, (2) espera resultados, (3) llama Enrichment para cada uno, (4) llama Writer para los score>=40, (5) reporta "Listo: 20 leads scrapeados, 18 enriquecidos, 12 drafts esperando tu aprobacion en /marketing/approval".

**Acceptance Scenarios**:

1. **Given** Franco escribe el pedido en lenguaje natural, **When** el Coordinator lo procesa, **Then** descompone en pasos y muestra plan al usuario ("Voy a: 1.scrapear, 2.enriquecer, 3.escribir drafts") esperando confirmacion antes de ejecutar.
2. **Given** el Coordinator esta ejecutando un paso, **When** Franco refresca la pagina, **Then** sigue viendo el progreso (no se pierde el estado).
3. **Given** un paso falla (ej: Scraper bloqueado), **When** el Coordinator detecta el error, **Then** detiene el flujo, reporta el error al usuario, y le da opciones ("Reintentar / Skip este paso / Abortar todo").
4. **Given** el Coordinator deberia ejecutar una accion irreversible (enviar mensajes), **When** llega a ese paso, **Then** PARA y pide aprobacion humana explicita (Principio IV).

---

### Edge Cases

- **Login con magic link expirado (>15 min)**: el sistema responde "Link expirado, solicita uno nuevo" con boton para regenerar.
- **Lead Scraper bloqueado por Google Maps (rate limit o captcha)**: detecta el bloqueo, marca el run como `status='blocked'`, espera 24h antes de reintentar; el equipo recibe notificacion.
- **Lead duplicado entre fuentes (Google Maps + manual)**: deduplicacion por (`telefono` normalizado, `dominio_web` normalizado, `nombre_normalizado`) — si match >=2 campos, dedupe.
- **Mensaje enviado pero lead bloquea numero**: Evolution API reporta error de entrega, sistema marca `delivery_status='blocked'` y agrega el lead a `do_not_contact`.
- **Conflicto de edicion en vault (2 personas la misma nota a la vez)**: presenta merge view con cambios de ambos, requiere resolucion humana, NO machaca silenciosamente.
- **Hard ceiling de costo alcanzado durante envio en curso**: completa el envio actual, bloquea siguientes, notifica banner rojo "Hard cap alcanzado — bloqueado".
- **Sender Agent en loop infinito (bug)**: el cost-aware sistema lo detecta al cruzar 50% del hard cap en <24h y emite alarma de "comportamiento anomalo" antes del bloqueo total.
- **Reply Handler clasifica mal y un `unsubscribe` queda como `interested`**: el socio asignado puede manualmente cambiar la clasificacion; el lead se marca como `dead` retroactivamente con audit log.
- **Doble login simultaneo del mismo usuario en 2 devices**: ambas sesiones son validas; sin lock pesimista en V1.
- **Lead sin telefono ni email valido**: el lead se acepta pero queda en estado `unreachable` (no entra a la cola de outreach hasta que se complete datos).

## Requirements

### Functional Requirements

#### Autenticacion y acceso

- **FR-001**: El sistema MUST permitir login solo a usuarios con direccion de email del dominio `@maniaco.online`.
- **FR-002**: El sistema MUST autenticar via magic link enviado al mail del usuario; el link MUST expirar a los 15 minutos.
- **FR-003**: El sistema MUST permitir configurar TOTP opcional por usuario; si esta habilitado, MUST requerirlo en cada nuevo dispositivo.
- **FR-004**: El sistema MUST mantener sesion activa por 30 dias sin re-autenticacion, salvo logout explicito.
- **FR-005**: El sistema MUST registrar cada login exitoso y fallido en tabla `auth_events` con `email`, `ip`, `user_agent`, `outcome`, `timestamp`.

#### Dashboard general

- **FR-006**: El dashboard general MUST renderizar todas las cards de departamentos (Marketing, Sales, Operations, Finance, Vault, Coordinator) en una sola pantalla sin scroll en viewport `>=1280x800`.
- **FR-007**: Las cards de departamentos en versiones futuras (V2/V3) MUST mostrarse deshabilitadas con badge "V2"/"V3", no ocultas.
- **FR-008**: El dashboard MUST mostrar feed de "actividad reciente" con las ultimas 10 acciones cross-departamento (timestamps + autor humano + accion).
- **FR-009**: El dashboard MUST mostrar avatars de socios actualmente conectados (Supabase realtime) con indicador "online" verde.
- **FR-010**: El dashboard MUST cargar end-to-end en menos de 2 segundos en conexion >=10 Mbps.

#### Gestion de leads

- **FR-011**: Los usuarios MUST poder crear leads manualmente con campos minimos: `nombre, industria, telefono O email, ciudad, fuente`.
- **FR-012**: El sistema MUST validar formato de telefono (E.164) y email antes de aceptar el lead.
- **FR-013**: El sistema MUST deduplicar leads automaticamente al insertar (criterio: match en `>=2` de `[telefono_normalizado, dominio_web, nombre_normalizado]`).
- **FR-014**: La vista kanban MUST mostrar columnas: `new, enriched, approved, sent, replied, qualified, closed, dead`.
- **FR-015**: Los usuarios MUST poder arrastrar leads entre columnas; cada movimiento manual MUST loggearse en `lead_history` con `moved_by, from_status, to_status, timestamp`.
- **FR-016**: Los usuarios MUST poder filtrar el kanban por `industria, ciudad, score_range, status, assigned_to`.
- **FR-017**: Cada lead MUST tener un panel de detalle con: datos basicos, score + reasoning, historial completo de acciones, conversacion (mensajes enviados y recibidos).

#### Agentes IA — Lead Scraper

- **FR-018**: El Lead Scraper MUST aceptar un brief en texto natural (industria, ciudad, criterios opcionales, cantidad target).
- **FR-019**: El Lead Scraper MUST extraer leads desde Google Maps con campos: `nombre, telefono, direccion, sitio_web, rating, num_reseñas, horarios`.
- **FR-020**: El Lead Scraper MUST usar **serpapi** (Google Maps Search API) como mecanismo de scraping. Razon: serpapi abstrae el riesgo de bloqueo de IP, tiene pricing predecible (~$0.002/query), y es legal (es una API intermediaria, no scraping headless directo). El Lead Scraper MUST respetar rate limits (default: 1 query cada 3 segundos, max 200 leads/dia, configurable en Vaultwarden). La API key de serpapi se guarda exclusivamente en Vaultwarden.
- **FR-021**: El Lead Scraper MUST devolver progreso parcial cada 10 leads procesados (visible en UI).
- **FR-022**: El Lead Scraper MUST manejar bloqueos de Google Maps (captcha, rate limit) marcando el run como `blocked` y esperando 24h.

#### Agentes IA — Enrichment

- **FR-023**: El Enrichment Agent MUST procesar cada lead nuevo automaticamente dentro de los 5 minutos de creacion.
- **FR-024**: El Enrichment Agent MUST asignar `score` entero entre 0-100 y `reasoning` textual de 2-4 lineas.
- **FR-025**: El Enrichment Agent MUST clasificar `industry, company_size_estimate, digital_maturity, fit_with_maniacos` como dimensiones intermedias del scoring.
- **FR-026**: El Enrichment Agent MUST reintentar 3 veces con backoff exponencial si falla, despues marcar lead como `score=null` con badge "sin clasificar".
- **FR-027**: Los usuarios MUST poder overridear el score de un lead manualmente con motivo textual.

#### Agentes IA — Outreach Writer

- **FR-028**: El Writer Agent MUST generar un draft de outreach para cada lead `enriched` con `score >= threshold` (default threshold: 40).
- **FR-029**: El draft MUST estar en el idioma del lead (default: español; detecta ingles desde sitio web del lead).
- **FR-030**: El draft de WhatsApp MUST tener <=300 caracteres; el draft de email MUST tener asunto + cuerpo separados.
- **FR-031**: El draft MUST personalizar con datos del lead (industria, observacion especifica de su negocio).
- **FR-032**: El draft MUST firmar con el nombre del socio asignado en primera persona (nunca con firma AI/Claude).
- **FR-033**: Los usuarios MUST poder regenerar un draft con un click ("otra angle"); cada regeneracion es un nuevo `agent_runs` separado.

#### Aprobacion humana de drafts (Principio IV)

- **FR-034**: NO se MUST enviar mensaje saliente alguno sin aprobacion explicita de un socio en V1 (cero excepciones).
- **FR-035**: La cola de aprobacion MUST presentar drafts uno a uno en pantalla completa con: lead context, draft editable, atajos visibles.
- **FR-036**: Los atajos de teclado obligatorios son: `A` (aprobar), `R` (rechazar), `E` (editar), `Spc` (saltar), flechas `<-` `->` (navegar), `Shift+A` (aprobar todos visibles).
- **FR-037**: La cola MUST permitir seleccionar multiples drafts con checkbox y aprobar/rechazar en masa (con dialogo de confirmacion >=5 items).
- **FR-038**: Cada decision MUST loggearse en `drafts` con `approved_by, decision, decided_at, rejection_reason?, edited_diff?`.
- **FR-039**: El sistema MUST tolerar doble-click idempotente (re-aprobar un draft ya aprobado no duplica).
- **FR-040**: La UX de aprobacion MUST permitir procesar 100 drafts en `<=10 minutos` (target: 6s por decision) — verificado en test de usabilidad con Noe.

#### Sender Agent

- **FR-041**: El Sender Agent MUST enviar via WhatsApp usando la Evolution API self-hosted (`evolution.maniaco.online`).
- **FR-042**: El Sender Agent MUST enviar via email usando Resend con dominio `maniaco.online`.
- **FR-043**: El Sender Agent MUST respetar rate limits: 30 WhatsApp/hora, 100 emails/hora, 200 mensajes/dia total (configurable).
- **FR-044**: El Sender MUST programar envios fuera de ventana horaria del lead (default `09:00-21:00` hora local del pais del lead) para el siguiente slot valido.
- **FR-045**: El Sender MUST reintentar 3 veces con backoff (30s, 2min, 10min) si el canal falla; despues marca `send_failed`.
- **FR-046**: El Sender MUST registrar el `external_message_id` retornado por Evolution o Resend para tracking de entrega.
- **FR-047**: El Sender MUST detectar idempotencia por `(lead_id, draft_hash)` para no enviar duplicado por race condition.
- **FR-048**: El Sender MUST detener cualquier envio si el hard ceiling de costo ($400/mes) se alcanza.

#### Reply Handler

- **FR-049**: El Reply Handler MUST recibir replies de email via **Cloudflare Email Routing → webhook propio**. Flujo: Cloudflare captura los replies al dominio `maniaco.online` y los reenvía a un endpoint del Hub (Edge Function Supabase o route Next.js) via HTTP POST con el raw email. El Hub parsea el `In-Reply-To` header para correlacionar con el `Message` original. Esto no requiere Mailgun/Postmark ni IMAP polling. WhatsApp replies llegan via webhook nativo de Evolution API (ya definido).
- **FR-050**: El Reply Handler MUST clasificar cada respuesta en una de 5 categorias: `interested, question, objection, not_interested, unsubscribe`.
- **FR-051**: El Reply Handler MUST tener confidence threshold: si confidence `<0.7` marca como `needs_human_review` en lugar de auto-clasificar.
- **FR-052**: Las respuestas `unsubscribe` MUST agregar al lead a tabla `do_not_contact`; cualquier intento futuro de outreach a ese telefono/email MUST bloquearse.
- **FR-053**: Las respuestas `interested, question, objection` MUST notificar al socio asignado al lead (notificacion en Hub + opcional Telegram opt-in).
- **FR-054**: El Reply Handler MUST consolidar conversaciones cross-canal bajo el mismo `lead_id` (responde por email despues de WhatsApp = misma conversacion).

#### Dashboard Marketing

- **FR-055**: El dashboard de Marketing MUST mostrar el funnel completo con conteos absolutos + ratios entre etapas.
- **FR-056**: El dashboard MUST mostrar costo del mes desglosado por agente, comparado contra soft cap ($200) y hard ceiling ($400), con barra de progreso de color (verde <70%, amarillo 70-100%, rojo >100%). El header global MUST mostrar chip compacto "💰 $X / $200" en todas las vistas con el mismo esquema de colores; click abre modal de breakdown.
- **FR-057**: El dashboard MUST mostrar ROI estimado del mes (revenue cerrado / costo total).
- **FR-058**: El dashboard MUST listar top 10 leads por score sin contactar con CTA "generar drafts".
- **FR-059**: El dashboard MUST refrescar metricas cada 30 segundos sin recargar la pagina.

#### Vault

- **FR-060**: La UI de vault MUST permitir crear, editar y eliminar notas markdown con preview en tiempo real.
- **FR-061**: Cada cambio en una nota MUST commitearse al repo git `ManIAco-org/vault` dentro de 30 segundos, con autor humano (sin atribucion AI).
- **FR-062**: La UI MUST resolver wikilinks `[[archivo]]` con click directo entre notas.
- **FR-063**: La UI MUST proveer busqueda full-text global sobre todo el vault con resultados rankeados.
- **FR-064**: El sistema MUST detectar conflictos de edicion simultanea entre miembros y presentar merge view (NO machacar).

#### Agent Coordinator

- **FR-065**: El Coordinator MUST aceptar pedidos en lenguaje natural y decompose en plan ejecutable de pasos.
- **FR-066**: El Coordinator MUST presentar el plan al usuario antes de ejecutar; requiere confirmacion explicita.
- **FR-067**: El Coordinator MUST reportar progreso en tiempo real durante la ejecucion (paso N de M, output parcial visible).
- **FR-068**: El Coordinator MUST DETENER el flujo y pedir aprobacion humana antes de cualquier accion irreversible (Principio IV).
- **FR-069**: El Coordinator MUST poder retomarse tras refresh de pagina (estado persistente).
- **FR-070**: Si un paso falla, el Coordinator MUST ofrecer opciones "Reintentar / Skip / Abortar".

#### Auditabilidad y costo (Principio VI)

- **FR-071**: Cada invocacion de agente IA MUST registrarse en tabla `agent_runs` con `agent_name, input_tokens, output_tokens, model, cost_usd, status, human_approved_by, input_payload, output_payload, error_msg, created_at`.
- **FR-072**: El sistema MUST calcular el costo del mes en USD agregando todos los `agent_runs` con `status IN ('success', 'override')`.
- **FR-073**: Cuando el costo del mes cruza el 70% del soft cap ($140 USD), MUST mostrar banner amarillo visible en todas las vistas del Hub.
- **FR-074**: Cuando el costo cruza el 100% del soft cap ($200 USD), MUST mostrar banner rojo y ofrecer "Override 12hs" con un click (se loggea en `agent_runs` con `status='override'` y `human_approved_by`). El override expira automaticamente a las 12hs.
- **FR-075**: Cuando el costo cruza el hard ceiling ($400 USD/mes), MUST bloquear automaticamente todos los agentes (incluido Sender); desbloqueo requiere aprobacion de 2 socios via toggle manual en Vaultwarden.
- **FR-076**: La retencion minima de `agent_runs` MUST ser 90 dias.

#### Comportamiento multi-mensaje y compliance

- **FR-081**: El Sender MUST aplicar un quiet time de 90 segundos minimo entre mensajes consecutivos al mismo lead para evitar spam-feel en el canal.
- **FR-082**: Si un lead ya recibio 2 mensajes sin respuesta (configurable, default 2), el sistema MUST mostrar warning "Este lead ya recibio N mensajes sin responder" en la cola de aprobacion y requerir confirmacion adicional antes de aprobar el siguiente draft.
- **FR-083**: El Writer Agent MUST verificar que el draft generado NO contenga montos de dinero, rangos de precio, ni palabras "inversion", "costo", "precio", "tarifa" en primer mensaje. Si detecta esas palabras en su propio output, MUST regenerar automaticamente (max 1 auto-regeneracion, si persiste escala a `needs_human_review`).
- **FR-084**: Los leads en `do_not_contact` MUST bloquearse al intentar generar draft o enviar mensaje, con error explicito "Este lead ha pedido no ser contactado (Ley 26.388)".
- **FR-085**: El kanban MUST soportar filtro por `tags` (filtro multi-tag con AND/OR configurable). Los tags se muestran como chips de color en las cards de kanban y en el panel de detalle del lead.

#### Appearance y UX foundations

- **FR-086**: La interfaz del Hub MUST usar **dark mode exclusivo** en V1. Sin toggle light/dark. Paleta: fondo `#0a0a0a`, superficie `#111111`, texto primario `#f5f5f5`, acentos segun brandkit ManIAcos.
- **FR-087**: Todos los estados vacios (kanban sin leads, cola de aprobacion vacia, dashboard sin metricas) MUST mostrar un mensaje de accion clara con CTA (nunca una pantalla en blanco): Kanban vacio → "No hay leads — [Scrapear con IA] o [+ Agregar manual]"; Cola vacia → "Todo aprobado ✓"; Dashboard vacio → "Crea tu primera campaña para ver metricas".
- **FR-088**: Las notificaciones criticas (reply `interested`, agente caido, incident abierto) MUST enviarse por Telegram a socios que tengan `telegram_chat_id` configurado en su perfil. Las notificaciones no-criticas (draft listo, enrichment completado) son solo in-Hub (badge + toast).

#### Constraints de Atribucion (Principio III)

- **FR-077**: NINGUN output saliente del sistema (commit, mensaje de outreach, post, draft de email, contenido de vault commiteado) MUST contener strings `Co-Authored-By: Claude`, `Generated with Claude`, `Generated with Claude Code`, ni cualquier mencion de AI/LLM/Claude/Anthropic.
- **FR-078**: El sistema MUST validar via pre-commit hook que mensajes de commit no contengan las strings prohibidas; si las contienen, MUST rechazar el commit.
- **FR-079**: Los firmantes humanos (`franco, lucho, noe`) MUST estar configurados en `~/.gitconfig` de cada user del server y respetados por todos los hooks.

#### WhatsApp risk management

- **FR-080**: El sistema MUST monitorear "health score" del numero WhatsApp activo calculando: `(mensajes_entregados / mensajes_enviados) * 0.6 + (respuestas / mensajes_entregados) * 0.4` en ventana de 7 dias. Si el score cae bajo 0.5 o se reciben 3+ reportes de spam, MUST emitir alarma visible en dashboard y sugerir pausa. **Plan B V1 aceptado**: si el numero se banea, el equipo acepta la pausa del canal WhatsApp, opera solo por email hasta recuperar el numero, y documenta el incidente en vault. NO se implementa numero secundario en V1. V1.5 modelara multi-cuenta con rotacion automatica.

### Key Entities

- **User**: representa a un miembro del equipo (Franco, Lucho, Noe). Atributos clave: `email @maniaco.online, full_name, role='admin', telegram_chat_id?, totp_secret?, gitconfig_name`. Solo 3 registros en V1.

- **Lead**: prospect comercial captado por el sistema. Atributos: `id, nombre, industria, telefono?, email?, sitio_web?, direccion?, ciudad, pais (default AR), score (0-100), reasoning, status (8 valores: new|enriched|approved|sent|replied|qualified|closed|dead), channel_preference ('whatsapp'|'email'), language (default 'es'), fuente ('google_maps'|'manual'|'referral'), created_by, created_at, assigned_to (User), tags (text[] — tags libres), deal_value_usd (numeric NULL), closed_at (timestamptz NULL)`. Relacion con `Draft` (1:N), `Message` (1:N), `LeadHistory` (1:N), `Reply` (1:N).

- **Draft**: borrador de mensaje generado por Writer Agent para un Lead. Atributos: `id, lead_id, channel ('whatsapp'|'email'), body, subject? (email), language, agent_run_id, status ('pending'|'approved'|'rejected'|'sent'|'expired'), approved_by?, approved_at?, rejection_reason?, edited_diff?`.

- **Message**: mensaje efectivamente enviado (tras aprobacion). Atributos: `id, lead_id, draft_id, channel, body, sent_at, external_message_id (Evolution o Resend), delivery_status, sent_by (User firmante)`. Relacion con `Reply` (1:N).

- **Reply**: respuesta entrante del lead. Atributos: `id, message_id, lead_id, channel, body, received_at, classification ('interested'|'question'|'objection'|'not_interested'|'unsubscribe'|'needs_human_review'), confidence, handled_by? (User), handled_at?`.

- **AgentRun**: cada invocacion de agente IA queda registrada aca (Principio VI). Atributos: ver schema en constitution.

- **VaultNote**: nota markdown del vault. Atributos: `id, file_path, title, content_md, last_edited_by, last_edited_at, git_commit_hash`. La fuente de verdad es el repo git; esta tabla es indice de busqueda y cache.

- **DoNotContact**: blacklist. Atributos: `telefono?, email?, reason, added_at, added_by (User o Reply Handler)`.

- **Campaign**: agrupacion de leads bajo un brief comun (ej: "Panaderias Cordoba marzo"). Atributos: `id, name, brief_text, target_count, created_by, created_at, status`. Relacion con `Lead` (1:N).

- **Incident**: registro de fallas de agente que requieren atencion. Atributos: `id, agent_name, input_hash, output_snapshot jsonb, confidence numeric?, error_msg text?, resolved_by (User NULL), resolved_at (timestamptz NULL), vault_lesson_url text NULL, created_at`. Los incidents sin resolver aparecen en dashboard como "Atencion requerida". Al resolver, el socio puede linkear a nota de vault con lesson learned.

- **LeadHistory**: log inmutable de cambios de estado de un lead. Atributos: `id, lead_id, moved_by (User o agent_name), from_status, to_status, note text NULL, created_at`. No se modifica, solo INSERT.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Un miembro del equipo (Noe, no-tecnica) completa el flujo end-to-end "crear campaña → scrapear 20 leads → aprobar drafts → enviar" en menos de **15 minutos** en su primer intento sin training previo.
- **SC-002**: 100 drafts de outreach pueden procesarse (aprobar/rechazar/editar) por un socio en **menos de 10 minutos** desde la cola de aprobacion (target: 6s por decision).
- **SC-003**: El tiempo desde que un miembro abre `hub.maniaco.online` hasta el dashboard interactivo es **<10 segundos** en conexion `>=10 Mbps` (incluye login si no hay sesion).
- **SC-004**: 95% de las respuestas a outreach son clasificadas correctamente por el Reply Handler (validado contra 100 replies etiquetadas manualmente por el equipo).
- **SC-005**: El costo operativo total V1 (Claude API + Resend + serpapi + infra) NO supera **$200 USD/mes** (soft cap) en el primer mes con volumen objetivo (200 outreaches enviados, 60 enrichments, 50 drafts generados). Hard ceiling de seguridad: $400/mes.
- **SC-006**: El sistema procesa al menos **50 leads/dia** end-to-end (scraping + enrichment + draft + envio aprobado) sin intervencion manual por agente caido.
- **SC-007**: Cero mensajes salientes contienen atribucion a AI/Claude/Anthropic (validado por audit script que escanea logs `messages` con grep semanal).
- **SC-008**: Cero envios sin aprobacion humana registrada en V1 (validado por query: `SELECT COUNT(*) FROM messages WHERE sent_at IS NOT NULL AND approved_by IS NULL` = 0).
- **SC-009**: El equipo cierra al menos **1 cliente nuevo en mes 2** desde el primer outreach via Hub (revenue mes 2 >= $500 setup).
- **SC-010**: 100% de los commits al repo del Hub y del vault tienen autor humano (validado por audit script que escanea `git log` cross-repo).
- **SC-011**: El uptime del Hub (medido por Uptime Kuma) es `>=99%` en periodos de horario comercial (9-21 hora AR).
- **SC-012**: La latencia P95 de operaciones interactivas en el Hub (excepto invocaciones a agentes IA) es `<500ms`.

## Assumptions

- **Volumen**: V1 maneja hasta 1000 leads totales en pipeline simultaneamente y 200 mensajes salientes/dia. Por encima de eso requiere refactor (no V1).
- **Geografia inicial**: leads y ventana horaria optimizada para Argentina (UTC-3). Otros paises soportados pero con ventana horaria por timezone del lead.
- **Idiomas**: outreach principalmente en español; soporte basico ingles para leads con sitios en ingles. Otros idiomas requieren ampliar prompts del Writer.
- **Cliente piloto**: el unico cliente productivo durante V1 sera RC Repuestos (ya existente) — no se carga manualmente en el Hub V1 (es proyecto separado). El Hub se valida con leads PROSPECT, no con el cliente existente.
- **WhatsApp Business**: usa la Evolution API self-hosted ya desplegada en server Oracle. Un numero unico para outreach. Riesgo de ban aceptado V1 con mitigacion (<50 msgs/dia, monitoreo health score FR-080). Plan B: pausar WA, operar solo email. Multi-cuenta en V1.5.
- **Email outbound**: usa Resend con dominio `maniaco.online` ya configurado en Cloudflare con SPF/DKIM/DMARC. Email replies detectadas via Cloudflare Email Routing → webhook (FR-049).
- **Google Maps scraping**: serpapi (Google Maps Search API) ratificado como mecanismo. ~$0.002/query, legal, abstracta riesgo de bloqueo. API key en Vaultwarden.
- **Costo del piloto**: el equipo asume gasto de $200-500 en tokens Claude durante el desarrollo del Hub (4-6 semanas vibecoding), separado del cost cap operativo mensual de $200/mes.
- **Entidad legal**: personas fisicas en V1. SAS en tramite (3-6 meses). Sin cambios en Hub para este cambio juridico.
- **Compliance Argentina**: cumplimiento Ley 26.388 para opt-out. GDPR no aplica (operacion 100% Argentina en V1).
- **Browser**: V1 solo soporta Chromium-based desktop (Chrome/Edge/Brave) en `>=1280x800`. Otros browsers/mobile son out-of-scope.
- **Mobile**: explicitamente fuera de V1. Si Noe quiere usar el Hub desde el celular, V2.
- **Disponibilidad del equipo**: asumimos que al menos un socio esta disponible para aprobar drafts en horario comercial (9-21 hora AR) durante la operacion del Hub. Si no hay aprobador, los drafts se acumulan; no hay auto-send V1.
- **Sales/Operations/Finance departments**: out of scope V1. Tienen cards en dashboard general pero sin funcionalidad (badge "V2"/"V3").
- **Client portal**: out of scope V1. Sera V3.
- **Multi-tenant**: out of scope V1-V3. Sera V4 si productizamos.

## Clarifications

### Session 2026-05-24

Respuestas pre-ratificadas por Franco antes de la sesion formal de clarificacion. Se incorporan directamente al spec.

- **Q: Metodo de scraping Google Maps (FR-020)** → **A: serpapi** (Google Maps Search API). Abstracta el riesgo de bloqueo, pricing ~$0.002/query, legal como intermediario. API key en Vaultwarden.

- **Q: Deteccion de email replies (FR-049)** → **A: Cloudflare Email Routing → webhook propio**. Cloudflare captura replies en `*@maniaco.online` y hace HTTP POST al Hub. El Hub correlaciona via header `In-Reply-To`. Sin Mailgun/IMAP polling.

- **Q: Plan B si numero WhatsApp se banea (FR-080)** → **A: Aceptar riesgo V1**. Limite de <50 mensajes/dia para reducir riesgo. Si se banea: pausar canal WA, operar solo email, documentar en vault, no implementar numero backup en V1. V1.5 modela multi-cuenta.

- **Q: Entidad legal del equipo** → **A: Personas fisicas** en V1. SAS (Sociedad por Acciones Simplificada) en tramite, estimado 3-6 meses. Hub no necesita cambios para este cambio juridico.

- **Q: Manejo de STOP / opt-out legal** → **A: Cumplimiento Ley 26.388** Argentina. Respuestas "STOP", "Baja", "No me contactes", "Remove" automaticamente mueven lead a `do_not_contact`. Pre-commit hook valida que lista blacklist no sea eliminada accidentalmente.

- **Q: Estrategia anti-ban WhatsApp** → **A: Rate limit conservador** (<50 msgs/dia), envio en ventana 9-21h, mensajes personalizados (no bulk), monitoring via health score (FR-080). Sin warm-up formal V1.

- **Q: Politica de retencion de datos** → **A: Leads activos indefinido; leads `dead` 12 meses luego se archivan (no se borran, van a tabla `leads_archive`). `agent_runs` 90 dias. `auth_events` 180 dias.** No hay GDPR estricto V1 (operacion Argentina).

- **Q: Transicion lead → cliente (cuando un lead se cierra)** → **A: Manual V1**. El socio mueve el lead a `status='closed'` + llena campo `deal_value_usd` + `closed_at`. No hay automatismo de CRM. Sales department (V2) manejara el pipeline formal.

- **Q: Sistema de notificaciones** → **A: In-Hub exclusivamente en V1** (badge contador en header, toast notificaciones). Telegram opt-in (campo `telegram_chat_id` en User) para notificaciones criticas (reply `interested`, agent caido). Sin email de notificacion del Hub.

- **Q: Manejo de errores de agente — confidence threshold** → **A: Threshold 0.70**. Cualquier clasificacion con confidence <0.70 escala a humano con flag `needs_human_review`. Se loggea en tabla `incidents` con `{agent, input_hash, output, confidence, timestamp}`. Lessons learned van al vault automaticamente cuando un incidente se resuelve.

- **Q: Failover / disaster recovery** → **A: Aceptar downtime de Vercel** (SLA 99.99% suficiente). Daily `pg_dump` de Supabase a Oracle ARM (script cron). Sin multi-region V1. Recovery Time Objective: 4hs (restaurar desde ultimo backup).

- **Q: Asignacion de leads a socios** → **A: Manual** en panel de lead. Campo `assigned_to` editable por cualquier admin. Default: quien scrapeo la campaña.

- **Q: Leads dormidos (>60 dias sin contacto)** → **A: Vista "Dormiods" en kanban** como columna/filtro especial para leads `enriched` o `contacted` sin actividad en >60 dias. CTA "Re-calentar" que regenera un draft fresco. No hay automatismo de re-warming V1.

- **Q: Multi-mensaje (secuencia de follow-ups)** → **A: Quiet time de 90 segundos** entre mensajes del mismo lead para evitar spam-feel. Maximo 2 mensajes sin respuesta (configurable, default 2). Tercer mensaje requiere aprobacion explicita con warning "Este lead ya recibio 2 mensajes sin responder".

- **Q: A/B testing de templates** → **A: Out of scope V1**. Los drafts se generan fresh cada vez por el Writer Agent con prompt unico. Si se necesita comparar angles, se usa el botón "Regenerar con otra angle" (FR-033). A/B formal va en V2.

- **Q: Mencion de precios en primer outreach** → **A: Nunca mencionar precios** en primer mensaje. El Writer Agent tiene constraint hardcoded: el draft MUST NOT contener montos, rangos de precio, ni referencias a "inversion" o "costo". Si detecta esas palabras en su propio output, debe regenerar.

- **Q: Diseno de UI de aprobacion batch** → **A: Estilo Tinder card stack** para modo mobile-desktop (aunque V1 solo desktop). Teclas: A (aprobar), R (rechazar), E (editar inline), Spc (skip), flechas navegar. Batch: checkbox lateral para seleccion multiple + boton "Aprobar N seleccionados". Vista tabla como alternativa con columnas: lead, canal, preview draft, score, acciones.

- **Q: Estrategia i18n (idiomas del Hub UI)** → **A: Solo español V1** para la interfaz del Hub. Outreach en español o ingles segun el lead (FR-029 ya lo cubre). Sin internacionalizacion de componentes UI.

- **Q: Tema visual** → **A: Dark mode exclusivo V1**. ManIAcos usa identidad oscura. Sin toggle light/dark en V1.

- **Q: Sistema de tags en leads** → **A: Tags libres** (array de strings en `leads.tags`). Sin taxonomia predefinida. El equipo agrega tags manualmente (ej: "prioridad-alta", "esperar-octubre", "RC-referral"). Filtros de kanban soportan filtro por tag.

- **Q: Permisos entre socios** → **A: Rol unico `admin`** para los 3 socios en V1. Sin granularidad de permisos. Cualquiera puede aprobar drafts de cualquier otro, editar cualquier lead, etc. (Principle VII — Simplicidad).

- **Q: Error cross-agente (falla en medio de un flujo Coordinator)** → **A: Fail fast con notificacion**. Si cualquier agente en cadena falla despues de 3 reintentos, el Coordinator detiene el flujo completo, notifica al socio con contexto ("Paso 2/4 fallido: Enrichment timeout en lead X"), y ofrece "Reintentar paso / Skip / Abortar". Los pasos ya completados NO se revierten (datos ya guardados quedan).

- **Q: Onboarding first-time user** → **A: Sin onboarding formal V1**. El equipo son 3 personas que se conocen el sistema. Unica ayuda: tooltips en iconos no obvios + estado vacio descriptivo (ver siguiente punto).

- **Q: Estados vacios (empty states)** → **A: Mensajes de accion clara**. Kanban sin leads: "No hay leads aun — [Scrapear con IA] o [+ Agregar manual]". Cola de aprobacion vacia: "Todo aprobado — el equipo esta al dia ✓". Dashboard sin actividad: "Hub recien iniciado — crea tu primera campaña para ver metricas aqui".

- **Q: Costo en dashboard — donde mostrar** → **A: En header global** (top-right, visible en todas las vistas) como chip compacto "💰 $84 / $200" con color segun threshold. Click abre modal de breakdown por agente. Banner grande solo aparece al cruzar 70% (amarillo) o 100% (rojo).

---

## Out of Scope (V1)

Para evitar scope creep, los siguientes elementos NO son parte de V1 aunque se mencionan en otros documentos:

- Departamentos Sales (pipeline CRM completo), Operations (project tracking), Finance (invoicing/MRR).
- Roles diferenciados (en V1 los 3 socios son admin con permisos identicos).
- Multi-tenant / multi-cliente del Hub.
- Mobile / responsive `<1280px`.
- Notificaciones por email salientes desde el Hub (todo en-Hub + Telegram opt-in).
- IG y LinkedIn scraping (V2 — solo Google Maps en V1).
- Auto-posting de contenido en redes (V2).
- Cal.com integration para booking automatico (V2).
- Stripe/Mercado Pago integration para cobros (V3).
- AFIP integration (V4).
- Public client portal read-only (V3).
- Dashboard ejecutivo (V4 una vez productizado).
