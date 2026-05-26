# ManIAcos Brand

Design system y tokens visuales para el Hub ManIAcos y la landing pública.

## Archivos

| Archivo | Descripción |
|---------|-------------|
| `DESIGN.md` | Sistema de diseño completo: filosofía, paleta, tipografía, componentes, voice |
| `tokens.json` | Tokens en formato JSON estructurado (source of truth) |
| `tokens.css` | CSS custom properties + clases de utilidad + integración Tailwind |
| `design-preview-v5.html` | Referencia visual viva — 6 paneles del Hub aprobados |

---

## Integración con el Hub (Next.js)

### 1. Instalar como dependencia

El repo Hub referencia este repo directamente vía npm/path. En `package.json` del Hub:

```json
{
  "dependencies": {
    "@maniaco/brand": "github:ManIAco-org/brand#main"
  }
}
```

O en desarrollo local con symlink:

```bash
# En ~/projects/brand
npm link

# En ~/projects/hub (o donde viva el repo Next.js)
npm link @maniaco/brand
```

### 2. Importar tokens.css

En `app/globals.css` del Hub:

```css
/* Tokens del design system */
@import '@maniaco/brand/tokens.css';

/* Resto del CSS del Hub */
```

O si usás un bundler que resuelve node_modules:

```css
@import '~@maniaco/brand/tokens.css';
```

### 3. Tailwind CSS v3 — preset

Crear `tailwind.preset.js` en el repo brand (próxima iteración). Por ahora, extender en `tailwind.config.ts` del Hub:

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss'

export default {
  darkMode: 'class',  // siempre 'class', nunca 'media'
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg:      'var(--bg)',
        s1:      'var(--s1)',
        s2:      'var(--s2)',
        s3:      'var(--s3)',
        border:  'var(--border)',
        t1:      'var(--t1)',
        t2:      'var(--t2)',
        t3:      'var(--t3)',
        acc:     'var(--acc)',
        run:     'var(--run)',
        ok:      'var(--ok)',
        warn:    'var(--warn)',
        err:     'var(--err)',
        cyan: {
          50:  'var(--cyan-50)',
          100: 'var(--cyan-100)',
          200: 'var(--cyan-200)',
          300: 'var(--cyan-300)',
          400: 'var(--cyan-400)',
          500: 'var(--cyan-500)',
          600: 'var(--cyan-600)',
          700: 'var(--cyan-700)',
          800: 'var(--cyan-800)',
          900: 'var(--cyan-900)',
        },
      },
      fontFamily: {
        ui:      ['Instrument Sans', 'system-ui', 'sans-serif'],
        mono:    ['Geist Mono', 'Courier New', 'monospace'],
        display: ['Fraunces', 'Georgia', 'serif'],
      },
      borderRadius: {
        sm:   'var(--r4)',
        md:   'var(--r6)',
        lg:   'var(--r8)',
        xl:   'var(--r12)',
        '2xl':'var(--r16)',
        full: 'var(--rF)',
      },
      boxShadow: {
        sm:   'var(--shadow-sm)',
        md:   'var(--shadow-md)',
        lg:   'var(--shadow-lg)',
        cyan: 'var(--shadow-cyan)',
        run:  'var(--shadow-run)',
      },
    },
  },
} satisfies Config
```

### 4. Tailwind CSS v4

En `app/globals.css`:

```css
@import '@maniaco/brand/tokens.css';

@theme {
  --color-acc:    var(--acc);
  --color-run:    var(--run);
  /* el resto ya viene en tokens.css via @layer base @theme */
}
```

### 5. Uso en componentes

```tsx
// Botón primario
<button className="btn-primary">+ Nueva tarea</button>

// Badge de estado
<span className="badge badge-ok">✓ prod</span>
<span className="badge badge-run">● corriendo</span>

// Card de proyecto
<div className="card">...</div>

// Sidebar pill activo
<div className="sidebar-pill active">RC Repuestos</div>

// Brand mark correcto
<span>Man<span className="brand-ia">IA</span>cos</span>

// Tailwind tokens directos
<div className="bg-s2 border border-border rounded-xl text-t1">
  <span className="text-acc font-semibold">Estado</span>
</div>
```

---

## Dark mode

**El Hub usa dark mode exclusivo.** La clase `dark` está hardcodeada en el `<html>`:

```tsx
// app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <html lang="es" className="dark">
      <body>{children}</body>
    </html>
  )
}
```

Nunca usar `prefers-color-scheme`. Nunca agregar toggle de tema. No existe light mode.

---

## Reglas de paleta (resumen ejecutivo)

| Color | Cuándo usarlo |
|-------|---------------|
| Cyan `#06B6D4` | Acciones, activos, marca, 60-70% del color |
| Lima `#A3E635` | **Solo** cuando algo está corriendo/live ahora |
| Verde `#22C55E` | Build ok, tests pasando, deploy exitoso |
| Amarillo `#F59E0B` | Warnings, HITL pendiente, CI lento |
| Rojo `#EF4444` | Errores, tests fallando, rollback |
| Grises | Todo lo que no tiene estado que comunicar |

---

## Referencia visual

Abrir `design-preview-v5.html` en el browser para ver los 6 paneles del Hub aprobados:

- Panel 1: Dashboard Cards
- Panel 2: Dashboard Tabla
- Panel 3: Cliente — Resumen
- Panel 4: Cliente — Terminal (Claude coding)
- Panel 5: Cliente — Deploys
- Panel 6: Marketing Interno

---

## Fuentes (Google Fonts)

Agregar en `app/layout.tsx` o `<head>`:

```tsx
import { Instrument_Sans, Fraunces } from 'next/font/google'

// UI font — todos los pesos necesarios
const instrumentSans = Instrument_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ui',
  display: 'swap',
})

// Display — landing h1 ONLY, carga diferida
const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['700', '900'],
  variable: '--font-display',
  display: 'swap',
})

// Geist Mono viene incluida con Next.js 15
import { GeistMono } from 'geist/font/mono'
```

---

## Versión

`1.0.0` — Aprobado 2026-05-25. Mockup de referencia: `design-preview-v5.html`.
