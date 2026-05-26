# ManIAcos — Design System v1.0

## Filosofía

ManIAcos es una consultora de software AI-first que construye productos digitales para PyMEs argentinas y latinoamericanas. El diseño refleja esa identidad: **técnico pero humano, sin solemnidad**. Una máquina de precisión con temperatura.

**Principios rectores:**

1. **Claridad sobre estética** — cada píxel justificado por la información que porta. Densidad intencional, no decorativa.
2. **Dark-native** — el Hub vive en dark mode exclusivo. No hay toggle. La clase `dark` está hardcodeada en `<html>`. El dark no es un feature, es el producto.
3. **Cyan como señal, no decoración** — `#06B6D4` marca lo que importa: acciones, activos, identidad de marca. No se usa para embellecer.
4. **Lima = vida** — `#A3E635` aparece únicamente cuando algo está corriendo en este momento. No para éxito histórico, no para positive states genéricos. Solo para el estado activo/running.
5. **Silencio gris** — cuando no hay estado que comunicar, el elemento es gris. Sin color sin motivo.

---

## Brand Mark

### Man[IA]cos

La "IA" dentro del nombre es el núcleo visual de la marca. Reglas absolutas:

- **"IA" siempre en `#06B6D4` (cyan)**
- "Man" y "cos" en `--t1` (`#EFEFEF`) sobre fondos oscuros, o negro sobre fondos claros
- Nunca separar las letras "IA" del resto con espacios o caracteres especiales
- En UI: `<span class="brand-mark">Man<span class="brand-ia">IA</span>cos</span>`
- La tipografía del logotipo usa **Instrument Sans 700**
- En contextos donde el color no está disponible: "IA" en negrita o versalita, nunca sin distinción

```html
<!-- Correcto -->
<span>Man<span style="color:#06B6D4">IA</span>cos</span>

<!-- Incorrecto -->
<span>ManIAcos</span>         <!-- sin distinción cromática -->
<span>Man IA cos</span>       <!-- con espacios -->
<span>MANIACS</span>          <!-- normalizado -->
```

---

## Audiencia

| Capa | Quiénes son | Lo que ven |
|------|-------------|------------|
| **Equipo ManIAcos** (FR, LU, NO) | Developers + ops, alta tolerancia a densidad | Hub completo: todos los paneles, terminal, métricas |
| **Clientes PyME** | Dueños/gerentes de PyMEs argentinas, no técnicos | Vista cliente simplificada: resumen, tareas, roadmap |
| **Prospectos** (público web) | PyMEs buscando consultora tech | Landing page únicamente |

---

## Paleta

### Fundamentos

El sistema tiene **una sola variable de acento** (`--acc`) y **una sola variable de estado activo** (`--run`). Todo lo demás es gris o semántico.

```
Jerarquía de uso de color:
1. Cyan (#06B6D4)  — 60-70% de todos los elementos coloreados
2. Grises          — base neutral para la mayoría del UI
3. Lima (#A3E635)  — máximo 10-15%, solo "running/live"
4. Semánticos      — solo cuando comunicás un estado
```

### Surface Stack

| Token | Hex | Uso |
|-------|-----|-----|
| `--bg` | `#0A0A0A` | Fondo base de la aplicación |
| `--s1` | `#111111` | Sidebar, topbar, paneles flotantes |
| `--s2` | `#1A1A1A` | Cards, dropdowns, tooltips |
| `--s3` | `#242424` | Hover states, inputs activos |
| `--border` | `#262626` | Bordes de cards y separadores |
| `--bsub` | `#181818` | Bordes sutiles, dividers internos |

### Texto

| Token | Hex | Uso |
|-------|-----|-----|
| `--t1` | `#EFEFEF` | Texto primario (headings, labels importantes) |
| `--t2` | `#8A8F9E` | Texto secundario (metadatos, subtítulos) |
| `--t3` | `#525866` | Texto terciario (placeholders, disabled) |

### Acento Principal — Cyan

| Variable | Valor | Uso |
|----------|-------|-----|
| `--acc` | `#06B6D4` | Color puro: borders activos, iconos principales, text links |
| `--acc-d` | `rgba(6,182,212,0.10)` | Background sutil de badges, chips activos |
| `--acc-b` | `rgba(6,182,212,0.25)` | Background de elementos seleccionados, hover sobre cyan |

Escala completa para uso en CSS/Tailwind:

| Nombre | Hex |
|--------|-----|
| `cyan-50` | `#ECFEFF` |
| `cyan-100` | `#CFFAFE` |
| `cyan-200` | `#A5F3FC` |
| `cyan-300` | `#67E8F9` |
| `cyan-400` | `#22D3EE` |
| `cyan-500` | `#06B6D4` ← **brand** |
| `cyan-600` | `#0891B2` |
| `cyan-700` | `#0E7490` |
| `cyan-800` | `#155E75` |
| `cyan-900` | `#164E63` |

### Acento Secundario — Lima (Running Only)

| Variable | Valor | Uso |
|----------|-------|-----|
| `--run` | `#A3E635` | Indicador de proceso activo/live |
| `--run-d` | `rgba(163,230,53,0.10)` | Background de badge "corriendo" |
| `--run-b` | `rgba(163,230,53,0.22)` | Border de elementos live |

**Regla estricta:** Lima aparece SOLO en:
- Indicador "● coding" (Claude activo en terminal)
- Indicador "● corriendo" (agente ejecutándose ahora)
- Indicador "● deploy en progreso"
- Dot de estado en sidebar para cliente con Claude activo

Nunca usar lima para: éxito, aprobación, positive feedback, decoración.

### Estados Semánticos

| Token | Hex | Transparencia bg | Uso |
|-------|-----|-----------------|-----|
| `--ok` | `#22C55E` | `rgba(34,197,94,0.10)` | Build ok, tests pasando, deploy exitoso |
| `--warn` | `#F59E0B` | `rgba(245,158,11,0.10)` | Advertencia, HITL pendiente, CI lento |
| `--err` | `#EF4444` | `rgba(239,68,68,0.10)` | Error, test fail, deploy rollback |

**Regla:** Los estados semánticos solo aparecen cuando hay un estado que comunicar. Un elemento sin estado usa `--t2` (gris).

### Colores ELIMINADOS

- `#818CF8` violet/indigo — **eliminado** del sistema
- Cualquier purple, lavender, blue-ish accent secundario
- Orange como acento de marca

---

## Tipografía

### Stack

```
--ui:   'Instrument Sans', system-ui, sans-serif
--mono: 'Geist Mono', 'Courier New', monospace
```

La fuente de display `Fraunces` existe en el sistema pero tiene dominio estrictamente acotado.

### Instrument Sans — UI

La fuente principal de toda la interfaz. Pesos usados: 400 (body), 500 (labels), 600 (headings), 700 (logotipo).

**No usa itálicas.** Para énfasis: mayor peso o color cyan.

Carga via Google Fonts:
```html
<link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
```

### Geist Mono — Números y Código

Toda cifra que requiere alineación tabular, todo código, todo output de terminal, todo timestamp, todo ID.

Regla de aplicación: `font-family: var(--mono); font-variant-numeric: tabular-nums;`

Casos de uso obligatorio:
- Números en KPI cards (248 leads, 1.4M tokens)
- Commits hashes (`f1a2b3c`)
- Timestamps (`hace 40min`, `2h`)
- Scores numerados (HOT 87, sprint 67%)
- Code diffs y terminal output
- Build times, bundle sizes
- Coverage percentages

Carga via Google Fonts:
```html
<link href="https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500&display=swap" rel="stylesheet">
```

### Fraunces — Display (Landing Only)

**Dominio exclusivo:** `<h1>` del hero de la landing page pública. NUNCA en el Hub.

Pesos: 700-900. Configuración: `font-display: swap; font-style: italic` opcional para el hero.

```html
<!-- Solo aquí -->
<h1 class="hero-headline" style="font-family:'Fraunces',serif;">
  Construimos el software<br>que necesita tu empresa
</h1>
```

Carga via Google Fonts:
```html
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,700;9..144,900&display=swap" rel="stylesheet">
```

### Escala Tipográfica

| Nombre | Size | Weight | Line-height | Uso |
|--------|------|--------|-------------|-----|
| `text-xs` | 11px | 400-500 | 1.4 | Timestamps, captions, metadatos |
| `text-sm` | 12px | 400-500 | 1.5 | Body secundario, labels pequeños |
| `text-base` | 13px | 400-500 | 1.5 | Body principal del Hub |
| `text-md` | 14px | 500-600 | 1.4 | Labels prominentes, nombres de cliente |
| `text-lg` | 16px | 600 | 1.3 | Section headings |
| `text-xl` | 20px | 600-700 | 1.2 | Page titles |
| `text-2xl` | 24px | 700 | 1.1 | KPI numbers grandes |
| `text-3xl` | 32px | 700 | 1.0 | Hero stats, landing headlines secundarias |
| `text-hero` | 48-72px | 800-900 | 0.95 | h1 landing (Fraunces) |

---

## Spacing

Sistema basado en múltiplos de **8px** (base unit = 4px para casos edge).

| Token | px | rem | Uso |
|-------|----|-----|-----|
| `space-1` | 4px | 0.25rem | Micro gaps, icon padding |
| `space-2` | 8px | 0.5rem | Internal padding mínimo |
| `space-3` | 12px | 0.75rem | Padding de badges, chips |
| `space-4` | 16px | 1rem | Padding de cards, items de lista |
| `space-5` | 20px | 1.25rem | — |
| `space-6` | 24px | 1.5rem | Padding de secciones |
| `space-8` | 32px | 2rem | Separación entre secciones |
| `space-10` | 40px | 2.5rem | — |
| `space-12` | 48px | 3rem | Padding de paneles grandes |
| `space-16` | 64px | 4rem | Padding hero landing |

### Layout

| Medida | Valor | Uso |
|--------|-------|-----|
| Sidebar width | 192px | Sidebar colapsado |
| Sidebar expanded | 240px | Con texto completo |
| File tree width | 168px | Tree compacto en Terminal |
| Content max-width | 1200px | Contenido principal |
| Topbar height | 48px | Barra de navegación |
| Status bar height | 36px | Barra inferior en Terminal |

---

## Radius

| Token | Valor | Uso |
|-------|-------|-----|
| `r-sm` / `r4` | 4px | Inputs, badges pequeños inline |
| `r-md` / `r6` | 6px | Buttons, tooltips, tags |
| `r-lg` / `r8` | 8px | Dropdowns, modals pequeños |
| `r-xl` / `r12` | 12px | Cards, sidebar pills, panels |
| `r-2xl` / `r16` | 16px | Modals grandes, sheets |
| `r-full` / `rF` | 9999px | Status badges (pills), avatars |

---

## Sombras

Sutiles, siempre oscuras, nunca white-glow.

| Token | Valor | Uso |
|-------|-------|-----|
| `shadow-sm` | `0 1px 3px rgba(0,0,0,0.4)` | Cards en reposo |
| `shadow-md` | `0 4px 12px rgba(0,0,0,0.5)` | Cards on hover, dropdowns |
| `shadow-lg` | `0 8px 24px rgba(0,0,0,0.6)` | Modals, panels flotantes |
| `shadow-cyan` | `0 0 0 2px rgba(6,182,212,0.4)` | Focus ring, elementos activos |
| `shadow-run` | `0 0 0 2px rgba(163,230,53,0.35)` | Glow en elementos running |

---

## Componentes

### Cards de Proyecto

```
background:   --s2
border:       1px solid --border
border-radius: r12 (12px)
padding:      16px
shadow:       shadow-sm

hover:
  border-color: --acc-b
  shadow:       shadow-md
  transform:    translateY(-1px)
```

Anatomía de card de proyecto:
1. Header: avatar iniciales + nombre + stack + status pill
2. Commit row: autor + mensaje truncado + tiempo
3. Issues row: N abiertas + breakdown H/M/L en colores semánticos
4. PRs row: N en review (cyan badge)
5. Sprint bar: label + porcentaje + progress bar (cyan fill)

Status pills en card header:
- `✓ prod` — ok green
- `↑ deploy` — cyan (deploying)
- `● coding` — lima (Claude activo)
- `⚠ CI fail` — warn yellow
- `↷ paused` — gray dim

### Sidebar Pills (Clientes)

```
border-radius: r12 (12px)
padding:       6px 12px
font-size:     13px
font-weight:   500

activo:
  background:  --acc-d
  color:       --acc
  border:      1px solid --acc-b

hover:
  background:  --s3
  color:       --t1
```

Status dot en sidebar (bottom-right del avatar):
- Verde `--ok`: online/activo
- Lima `--run`: Claude coding ahora
- Amarillo `--warn`: issues pendientes
- Gris `--t3`: inactivo/pausado

### Botones

**Primary:**
```css
background:    #06B6D4  /* --acc */
color:         #000000  /* negro, no blanco */
border:        none
border-radius: r6
padding:       8px 16px
font-weight:   600
font-size:     13px

hover:
  background:  #22D3EE  /* cyan-400, más claro */
  transform:   translateY(-1px)
  box-shadow:  0 4px 12px rgba(6,182,212,0.35)
```

**Secondary:**
```css
background:    --s2
color:         --acc
border:        1px solid --acc-b
border-radius: r6
padding:       8px 16px
font-weight:   500
font-size:     13px

hover:
  background:  --acc-d
  border-color: --acc
```

**Ghost (solo uso interno — no en acciones principales):**
```css
background:    --s2
color:         --t2
border:        1px solid --border
border-radius: r6

hover:
  color:       --t1
  border-color: --s3
```

**Destructive:**
```css
background:    rgba(239,68,68,0.12)
color:         --err
border:        1px solid rgba(239,68,68,0.3)

hover:
  background:  rgba(239,68,68,0.2)
```

### Status Badges (Pills)

```css
border-radius: 9999px  /* rF */
padding:       2px 8px
font-size:     11px
font-weight:   500
font-family:   var(--mono)  /* tabular para cifras */
```

Variantes:
```
ok:    bg --ok-d,   color --ok,   border --ok-b
warn:  bg --warn-d, color --warn, border --warn-b
err:   bg --err-d,  color --err,  border --err-b
run:   bg --run-d,  color --run,  border --run-b
acc:   bg --acc-d,  color --acc,  border --acc-b
```

### Avatars

```css
border-radius: 50%
width: 28px  /* default */
height: 28px
position: relative

/* Status dot */
::after {
  position: absolute;
  bottom: 0; right: 0;
  width: 8px; height: 8px;
  border-radius: 50%;
  border: 1.5px solid --bg;
}
```

### Inputs

```css
background:    --s2
border:        1px solid --border
border-radius: r6
padding:       8px 12px
color:         --t1
font-size:     13px

focus:
  border-color: --acc
  box-shadow:   0 0 0 2px rgba(6,182,212,0.25)
  outline:      none

placeholder:
  color: --t3
```

### Tables

```css
/* Header */
th {
  font-size:    11px;
  font-weight:  600;
  color:        --t3;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding:      8px 12px;
  border-bottom: 1px solid --border;
}

/* Row */
td {
  padding:      10px 12px;
  font-size:    13px;
  color:        --t2;
  border-bottom: 1px solid --bsub;
}

tr:hover td { background: --s3; }
```

### Terminal / Código

```css
background:    #0D0D0D
font-family:   var(--mono)
font-size:     12px
line-height:   1.6

/* Colores de sintaxis en terminal */
--syn-cmd:     #06B6D4  /* comandos */
--syn-ok:      #22C55E  /* success output */
--syn-warn:    #F59E0B  /* warnings */
--syn-err:     #EF4444  /* errors */
--syn-comment: #525866  /* comentarios/dim */
--syn-string:  #A3E635  /* strings activos */
--syn-path:    #8A8F9E  /* file paths */
```

### Progress Bars

```css
background:    --s3
border-radius: rF
height:        4px

.fill {
  background:    --acc  /* cyan */
  border-radius: rF
  /* Para sprint en riesgo: */
  background:    --warn
  /* Para sprint completo: */
  background:    --ok
}
```

### Breadcrumbs

```css
font-size:    11px
font-weight:  500
color:        --t3
text-transform: uppercase
letter-spacing: 0.08em

/* Separator */
→ color: --t3

/* Último nodo */
color: --t2
```

---

## Dominios del Hub

El Hub tiene dos dominios completamente separados. Nunca mezclar su contenido.

### Dominio A — Proyectos de Clientes

Vistas de trabajo para cada proyecto que ManIAcos está construyendo.

**Tabs disponibles:** Resumen / Tareas / Roadmap / Docs / Archivos / Terminal / Deploys / Settings

**Contenido:** commits, deploys, issues, tasks, código, specs, métricas técnicas.

**PROHIBIDO en Dominio A:** leads, drafts de email, agentes de marketing, HITL queue, scraper, prospectos.

### Dominio B — Marketing Interno

Sección única de ManIAcos para gestionar sus propios prospectos y pipeline de ventas.

**Breadcrumb:** solo "Marketing" — nunca incluir nombre de cliente

**Contenido exclusivo:** lead-nurture agents, email HITL, scraper, Cola de Leads, drafts de email, tasas de apertura/conversión.

---

## Voice & Tone

### Principios

- **Directo sin ser frío.** "Falló el CI en Grupo Seis" no "Hay un problema en la pipeline de integración continua".
- **Técnico sin jerga innecesaria.** Los clientes PyME leen algunas vistas. Si algo puede ser claro y corto, es claro y corto.
- **En español rioplatense** para mensajes del sistema, labels, empty states. No inglés técnico mezclado (excepto términos sin traducción: commit, deploy, branch, sprint, PR).
- **Sin solemnidad.** El Hub es una herramienta de trabajo, no una presentación corporativa.
- **Números precisos.** "67%" no "en progreso". "hace 40min" no "recientemente". "3H / 4M / 1L" no "varios issues".

### Ejemplos

| Malo | Bueno |
|------|-------|
| "Integration pipeline failure detected" | "CI falló — Grupo Seis" |
| "Your request is being processed" | "Procesando batch_248 — 3/8 leads" |
| "No items to display" | "Sin tareas activas en este sprint" |
| "Action completed successfully" | "PR #14 aprobado" |
| "User Franco Martín" | "Franco S." |

### Empty States

- No emojis decorativos
- Una línea descriptiva en `--t2`
- CTA en cyan si la acción es directa: "+ Nueva tarea", "+ Agregar cliente"
- Sin ilustraciones (uso interno, no onboarding marketing)

---

## Dark Mode Implementation

```html
<!-- Siempre en el <html> — nunca togglable -->
<html lang="es" class="dark">
```

```css
/* En el root del CSS */
:root {
  color-scheme: dark;
}

/* Nunca esto: */
@media (prefers-color-scheme: light) { ... }  /* ignorado */
.light-mode { ... }                           /* no existe */
```

El dark mode no es una feature. Es el producto.

---

## Versión

| Campo | Valor |
|-------|-------|
| Versión | 1.0.0 |
| Fecha | 2026-05-25 |
| Mockup de referencia | `design-preview-v5.html` |
| Estado | Aprobado para Phase 1 |
