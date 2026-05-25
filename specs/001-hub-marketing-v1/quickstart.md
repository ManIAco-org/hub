# Quickstart: Hub ManIAcos V1 — Dev Environment

**Branch**: `001-hub-marketing-v1` | **Date**: 2026-05-24

Guía para levantar el entorno de desarrollo local. Target: Franco o Lucho arrancando desde cero en una máquina nueva. Tiempo esperado: ~20 minutos.

---

## Prerequisites

- Node.js ≥20 (LTS) — instalar con `nvm` o `fnm`
- `bun` ≥1.1 — `curl -fsSL https://bun.sh/install | bash`
- Supabase CLI — `npm install -g supabase`
- Git configurado con identidad correcta:
  ```bash
  git config --global user.name "Franki-678"
  git config --global user.email "fransanmartin.ies@gmail.com"
  ```
- Acceso a Vaultwarden (`vault.maniaco.online`) para obtener los secrets

---

## Paso 1: Clonar y setup inicial

```bash
git clone git@github.com:maniacos-dev/hub.git
cd hub
bun install
```

---

## Paso 2: Variables de entorno

Crear `.env.local` en la raíz del proyecto (NO se commitea — está en `.gitignore`):

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key-from-supabase-dashboard>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key-from-vaultwarden>

# Anthropic
ANTHROPIC_API_KEY=<key-from-vaultwarden>

# Evolution API (WhatsApp)
EVOLUTION_API_URL=https://evolution.maniaco.online
EVOLUTION_API_KEY=<key-from-vaultwarden>
EVOLUTION_WEBHOOK_SECRET=<secret-from-vaultwarden>

# Resend (email)
RESEND_API_KEY=<key-from-vaultwarden>
RESEND_WEBHOOK_SECRET=<secret-from-vaultwarden>

# serpapi (Google Maps scraping)
SERPAPI_API_KEY=<key-from-vaultwarden>

# Webhooks
EMAIL_WEBHOOK_SECRET=<secret-from-vaultwarden>
INTERNAL_WEBHOOK_SECRET=<secret-from-vaultwarden>

# Vault git API (Oracle ARM)
VAULT_API_URL=https://vault-api.maniaco.online
VAULT_API_SECRET=<secret-from-vaultwarden>

# Cost caps (pueden overridearse localmente para tests)
SOFT_CAP_USD=200
HARD_CEILING_USD=400
```

Obtener los valores desde Vaultwarden: `vault.maniaco.online` → colección "Hub ManIAcos Dev".

---

## Paso 3: Base de datos local con Supabase

```bash
# Iniciar Supabase local (Docker requerido)
supabase start

# Aplicar migraciones
supabase db push

# El output muestra la URL y anon key locales:
# API URL: http://127.0.0.1:54321
# anon key: eyJ...
# service_role key: eyJ...
```

Actualizar `.env.local` con los valores locales de Supabase para desarrollo.

Seed de los 3 usuarios admin:
```bash
supabase db seed
# Aplica: supabase/migrations/0003_seed_users.sql
```

---

## Paso 4: Levantar el servidor de desarrollo

```bash
bun dev
# → Hub corriendo en http://localhost:3000
```

Abrir `http://localhost:3000` en Chrome → pantalla de login → ingresar `franco@maniaco.online` → Supabase local envía magic link a la consola de Inbucket (email local):

```
Inbucket (email dev): http://127.0.0.1:54324
```

Hacer click en el magic link en Inbucket → login exitoso.

---

## Paso 5: Smoke tests locales (opcional)

```bash
# Instalar browsers de Playwright (solo primera vez)
bunx playwright install chromium

# Correr los 5 smoke tests contra localhost
bunx playwright test
```

Los 5 tests deben pasar antes de cualquier deploy.

---

## Flujo de desarrollo típico

1. Crear feature branch: el spec-kit lo maneja con `/speckit-specify`
2. Vibecoding con Claude Code — el 90% del código lo escribe Claude
3. Verificar que los smoke tests sigan pasando: `bunx playwright test`
4. PR → revisión de 1 socio → merge a `master` → Vercel auto-deploya a `hub.maniaco.online`

---

## Estructura de archivos clave

| Archivo | Propósito |
|---------|-----------|
| `src/lib/cost.ts` | Verificación de costo cap — llamar antes de cada agente |
| `src/lib/anthropic.ts` | Cliente Anthropic con prompt caching y registro automático en `agent_runs` |
| `src/agents/*.ts` | Un archivo por agente — input/output tipado con Zod |
| `src/types/database.ts` | Auto-generado con `supabase gen types typescript` — NO editar manualmente |
| `supabase/migrations/` | Schema de DB — cambios via nueva migración, nunca editar las existentes |

---

## Comandos frecuentes

```bash
# Regenerar tipos de DB después de cambiar schema
supabase gen types typescript --local > src/types/database.ts

# Nueva migración de DB
supabase migration new nombre_de_la_migracion

# Ver logs de Supabase local
supabase logs

# Reset DB local (borra datos de dev)
supabase db reset

# Build de producción
bun run build

# Typecheck
bunx tsc --noEmit
```

---

## Deploy a producción

Solo se deployea desde `master` via Vercel auto-deploy. Vercel ejecuta en CI:
1. `bun install`
2. `bun run build` (Next.js build)
3. Si el build pasa → deploy automático a `hub.maniaco.online`
4. Los 5 smoke tests de Playwright corren post-deploy contra prod (configurar en Vercel CI)

**NUNCA** hacer `git push --force` a `master`.

---

## Troubleshooting frecuente

| Problema | Solución |
|----------|----------|
| Magic link no llega en dev | Revisar Inbucket en `localhost:54324` |
| `SUPABASE_SERVICE_ROLE_KEY` falta | Obtener de Vaultwarden → Hub ManIAcos Dev |
| Tipos de DB desactualizados | `supabase gen types typescript --local > src/types/database.ts` |
| Smoke test "auth" falla | Verificar que `NEXT_PUBLIC_SUPABASE_URL` apunte a local (no prod) |
| serpapi 401 | Verificar `SERPAPI_API_KEY` en `.env.local` |
| Evolution API timeout | Normal en dev — Evolution solo está en Oracle. Usar mock en tests. |
