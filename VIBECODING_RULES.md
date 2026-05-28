# VIBECODING_RULES.md — Constitución Técnica del Hub ManIAcos

> Leer antes de cualquier task. Estas reglas son no-negociables y
> override cualquier default del modelo.

---

## 1. Identidad de commits

- **Autor exclusivo:** `Franco San Martín <franco.sanmartin@maniaco.online>`
- **PROHIBIDO en cualquier commit, PR, o mensaje outbound:**
  - `Co-Authored-By: Claude`
  - `Generated with Claude Code`
  - `🤖 Generated with Claude Code`
  - Cualquier footer que mencione AI / LLM / Claude / Anthropic
- Git config a usar siempre:
  ```bash
  git -c user.name="Franco San Martín" -c user.email="franco.sanmartin@maniaco.online" commit
  ```

## 2. Stack canónico

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 15 App Router + TypeScript strict |
| Estilos | Tailwind CSS v4 + brand tokens (`file:brand`) |
| Componentes | shadcn/ui + Radix UI primitives |
| Auth | Supabase Auth (magic link + TOTP opcional) |
| DB | Supabase Postgres + RLS + Realtime |
| Hosting | Vercel Hobby (`hub.maniaco.online`) |
| Terminal | Docker en Oracle ARM (`term.maniaco.online`) |
| Secrets | Vaultwarden — NUNCA en `.env` commiteado |

## 3. TypeScript — reglas de strictness

- `strict: true` + `noUncheckedIndexedAccess: true` — siempre
- Sin `any` implícito — usar tipos explícitos o `unknown`
- Preferir `type` sobre `interface` salvo para extensión
- Importar tipos con `import type { ... }`
- Correr `npm run type-check` antes de cada commit

## 4. Design system — reglas absolutas

### Tipografía
- **UI:** Instrument Sans (400/500/600/700) — TODO el hub
- **Mono:** Geist Mono — código, terminal, números
- **Display (Fraunces):** SOLO landing pública. NUNCA en el hub.
- **Sin cursivas** en el hub — no existe italic en Instrument Sans para UI

### Colores
- Cyan `#06B6D4` (`--acc`) — acciones, activos, brand mark "IA", links
- Lima `#A3E635` (`--run`) — SOLO cuando algo está corriendo ahora mismo
- Gris — cualquier elemento sin estado específico
- Semánticos (`--ok`, `--warn`, `--err`) — solo para estados de éxito/alerta/error

### Brand mark
```tsx
// CORRECTO
<span>Man<span style={{ color: 'var(--acc)' }}>IA</span>cos</span>

// INCORRECTO — IA sin distinción cromática
<span>ManIAcos</span>
```

### Tokens de uso obligatorio
- Border radius: `var(--r12)` (12px) en cards, `var(--r6)` (6px) en botones/inputs
- Shadows: `var(--shadow-sm)` en cards normales, `var(--shadow-md)` en hover
- Surfaces: `--bg` (app), `--s1` (sidebar/topbar), `--s2` (cards), `--s3` (hover)
- Texto: `--t1` (primario), `--t2` (secundario/meta), `--t3` (placeholder/disabled)
- Bordes: `--border` (cards), `--bsub` (dividers internos)

### Dark mode
- Clase `dark` hardcodeada en `<html>` — nunca toggle, nunca `prefers-color-scheme`
- Sin modo claro — no existe, no se planea

## 5. Componentes — patrones canónicos

```tsx
// Botón primario — CTA de la acción principal
<button className="btn-primary">Acción</button>

// Botón secundario — acciones de apoyo
<button className="btn-secondary">Secundaria</button>

// Badge de estado
<span className="badge badge-ok">✓ prod</span>
<span className="badge badge-run">● running</span>
<span className="badge badge-warn">⚠ warning</span>

// Card
<div className="card">contenido</div>

// Sidebar pill activo
<div className="sidebar-pill active">RC Repuestos</div>

// Input
<input className="input" />
```

## 6. Principios UX

1. **Noe-First (Principio I):** cada feature usable en <30s sin training.
   - Sin tooltips de "hover para aprender"
   - Sin modales de onboarding
   - Sin texto de instrucción que no sea inline y conciso
2. **Cero comandos manuales (Principio II):** el equipo nunca tipea git, docker, o comandos de deploy.
3. **Densidad intencional:** datos útiles > espacio en blanco decorativo.
4. **Empty states con acción:** nunca dejar pantalla vacía sin CTA clara.

## 7. Supabase — patrones

```typescript
// Client components → createBrowserClient
import { createClient } from '@/lib/supabase/client'

// Server components / route handlers → createServerClient
import { createClient } from '@/lib/supabase/server'

// Queries con RLS — NUNCA usar service_role key en el hub frontend
// service_role solo para terminal-service y funciones administrativas

// Realtime pattern:
const channel = supabase
  .channel('team_status')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'team_status' },
    (payload) => handleUpdate(payload))
  .subscribe()

// Cleanup obligatorio en useEffect return:
return () => { supabase.removeChannel(channel) }
```

## 8. Reglas de archivos

- `.env.local` — NUNCA commiteado, siempre en `.gitignore`
- `brand/` — SÍ commiteado (es una path dependency de Vercel)
- `supabase/migrations/` — SÍ commiteado (historial de schema)
- `node_modules/` — NUNCA commiteado
- Secrets → Vaultwarden. Si no está en Vaultwarden, no existe.

## 9. Estructura de directorios

```
src/
  app/
    (auth)/         ← login, callback, error (sin layout de dashboard)
    dashboard/      ← layout.tsx + todos los paneles
      page.tsx      ← Panel 1 Team Status
      proyectos/    ← Panel 2 Projects
      clientes/     ← Panel 3 Clientes
      terminal/     ← Panel 4 Terminal
      deploys/      ← Panel 5 Deploys
      marketing/    ← Panel 6 Marketing
  components/
    layout/         ← Sidebar, Topbar, DashboardLayout
    panels/         ← TeamStatusPanel, ProjectsPanel, etc.
    ui/             ← Primitivos reutilizables (Button, Badge, Card, etc.)
  lib/
    supabase/       ← client.ts, server.ts, upsert-member.ts
    types.ts        ← tipos compartidos
    utils.ts        ← cn() y helpers
  middleware.ts     ← auth middleware
```

## 10. Antes de cada commit

```bash
npm run type-check   # TypeScript strict — debe pasar limpio
# npm run lint       # ESLint (opcional en dev, obligatorio antes de PR)
```

## 11. Modelo de Autenticación Claude

### Cuentas por miembro

- Cada miembro tiene **SU cuenta Anthropic personal** con su mail `@maniaco.online`
  (Pro $20 o Max $100 — decisión personal/empresa)
- Cada miembro hace `claude /login` **UNA VEZ** desde su user del servidor Oracle
- El token queda en `~/.config/claude/credentials.json` del user Linux específico
- Cuando el Hub abre terminal embebida → spawnea `claude` como ese user Linux → usa la cuenta correspondiente

### Vibecoding humano (Pro/Max vía Claude Code CLI)

- Mediante terminal del Hub (con la cuenta del user autenticado en el server)
- Mediante laptop personal de cada miembro (misma cuenta, multi-device)
- **LEGAL:** misma persona usa SU cuenta desde N dispositivos
- **ILEGAL:** dos personas usan LA MISMA cuenta (account sharing)

### Agents 24/7 automáticos (API key dedicada)

- Anthropic Console org **"ManIAcos"** con API key `"agents-server"`
- Spending limit configurado (default $150/mes)
- Usada **exclusivamente** por procesos automáticos del server:
  - Lead Scraper, Enrichment Agent, Writer Agent
  - Reply Handler, Sender Agent, futuros agentes
- **JAMÁS** usada para vibecoding humano interactivo

### Setup de nueva persona

```bash
# 1. Crear user Linux en server (como root)
useradd -m -s /bin/bash <nombre>
passwd <nombre>

# 2. La persona accede vía SSH a SU user
ssh <nombre>@oracle.maniaco.online

# 3. Instalar y loguear Claude Code (una sola vez)
claude /login
# → abre browser → login con cuenta @maniaco.online

# 4. Verificar
claude --version   # debe responder OK

# 5. Listo — cuando abra terminal del Hub como ese user, Claude ya está autenticado
```

### Usuarios actuales

| User Linux | Cuenta Anthropic                  | Plan |
|------------|-----------------------------------|------|
| `franco`   | franco.sanmartin@maniaco.online   | Max  |
| `lucho`    | luis.giannasi@maniaco.online      | Pro  |
| `noe`      | noelia.bottallo@maniaco.online    | Pro  |

> **`contacto@maniaco.online`** es cuenta institucional — **sin acceso a terminal**.
> Si alguien intenta usarla verá: *"Cuenta institucional sin terminal. Usá tu mail personal @maniaco.online"*

### Actualización automática del Claude CLI

Claude Code CLI se actualiza **automáticamente cada lunes a las 04:00 UTC** (01:00 Argentina)
via `/etc/cron.d/maniaco-claude-update`. El script corre:

```bash
sudo -u franco bash -lc 'npm install -g @anthropic-ai/claude-code'
sudo -u lucho  bash -lc 'npm install -g @anthropic-ai/claude-code'
sudo -u noe    bash -lc 'npm install -g @anthropic-ai/claude-code'
```

Logs en `/var/log/claude-update.log`. Para instalar el cron o forzar update manual:

```bash
sudo bash /srv/maniacos/hub/scripts/server/install-cron.sh        # instala ambos crons
sudo bash /srv/maniacos/hub/scripts/server/update-claude-cli.sh   # forzar update ahora
```

---

*Versión 1.2.0 — Sprint 2. Emails corregidos, auto-update claude CLI, terminal systemd.*
