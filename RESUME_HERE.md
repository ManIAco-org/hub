# RESUME_HERE — Hub ManIAcos Spec-Kit Workflow

**Ultima actualizacion**: 2026-05-24
**Branch activa**: `001-hub-marketing-v1`
**Proxima fase**: `/speckit-plan` (Fase 4)

---

## Estado actual del workflow

| Fase | Skill | Status | Artefacto |
|------|-------|--------|-----------|
| 0 | Setup | ✅ Done | `specify` CLI v0.8.13 instalado |
| 1 | `/speckit-constitution` | ✅ Done v1.1.0 | `.specify/memory/constitution.md` |
| 2 | `/speckit-specify` | ✅ Done | `specs/001-hub-marketing-v1/spec.md` |
| 3 | `/speckit-clarify` | ✅ Done | spec.md actualizado, 23 Q&A incorporados |
| 4 | `/speckit-plan` | ⏳ Pendiente OK de Franco | `specs/001-hub-marketing-v1/plan.md` |
| 5 | `/speckit-tasks` | ⏳ Pendiente | `specs/001-hub-marketing-v1/tasks.md` |
| 6 | `/speckit-taskstoissues` | ⏳ Pendiente | GitHub Issues en `maniacos-dev/hub` |

---

## Resumen ejecutivo de la spec

**Producto**: Hub ManIAcos V1 — Departamento Marketing
**Branch**: `001-hub-marketing-v1`
**Socios**: Franco (vibecoder/ops), Lucho (dev), Noe (validadora UX)
**URL destino**: `hub.maniaco.online`

### Lo que construimos en V1

Pipeline de marketing inbound con IA-assisted, HITL completo:

1. **Login** — magic link + TOTP, solo `@maniaco.online`
2. **Dashboard general** — estado de departamentos, actividad, online presence
3. **Lead pipeline** — kanban 8 estados, filtros, tags libres
4. **Lead Scraper** — serpapi (Google Maps), brief en lenguaje natural
5. **Enrichment Agent** — score 0-100, reasoning, 3 dimensiones
6. **Writer Agent** — drafts WA (<300 chars) / email, personalizados, sin firma AI
7. **Approval queue** — Tinder-style, atajos A/R/E, batch checkbox, 100 drafts en ≤10 min
8. **Sender Agent** — Evolution API (WA) + Resend (email), rate limits, ventana horaria
9. **Reply Handler** — webhook Evolution + Cloudflare Email Routing, 5 categorias, confidence threshold 0.70
10. **Marketing dashboard** — funnel, ROI, costo vs cap, top oportunidades
11. **Vault UI** — editor markdown, wikilinks, git auto-sync
12. **Agent Coordinator** — chat orchestrator, plan → confirm → ejecutar

### Numeros clave

- FRs: 88 (FR-001..FR-088)
- User Stories: 11 (P1: 4, P2: 4, P3: 3)
- Success Criteria: 12
- Cost caps: $200/mes soft, $400/mes hard (constitution v1.1.0)
- Override: 12hs con 1 click
- Banner amarillo: 70% ($140), banner rojo: 100% ($200)

### Decisiones ratificadas en /speckit-clarify

- **Scraping**: serpapi Google Maps API (~$0.002/query)
- **Email replies**: Cloudflare Email Routing → webhook Hub (header `In-Reply-To`)
- **WhatsApp ban**: aceptar riesgo V1, <50 msgs/dia, monitor health score, plan B = solo email
- **Tema**: dark mode exclusivo V1
- **i18n Hub**: solo español V1
- **Notificaciones**: in-Hub + Telegram opt-in para criticas
- **Roles**: `admin` unico para los 3 socios en V1
- **Error handling**: confidence <0.70 → `needs_human_review`, tabla `incidents`
- **Multi-mensaje**: quiet 90s, max 2 sin respuesta con warning
- **No precios**: Writer constraint hardcoded (primer mensaje)
- **Compliance**: Ley 26.388 Argentina para STOP/opt-out

---

## Para retomar la sesion

```bash
# Verificar branch
git branch --show-current
# → debe ser: 001-hub-marketing-v1

# Proxima accion:
# /speckit-plan
```

### Archivos clave

| Archivo | Descripcion |
|---------|-------------|
| `.specify/memory/constitution.md` | v1.1.0 — 9 principios, cost caps $200/$400 |
| `specs/001-hub-marketing-v1/spec.md` | Spec completa, 88 FRs, 0 markers |
| `specs/001-hub-marketing-v1/checklists/requirements.md` | Checklist limpio, LISTA para plan |
| `CLAUDE.md` | Runtime guidance para Claude Code |

---

## Deuda tecnica / TODO post-spec

- [ ] Actualizar `.specify/templates/plan-template.md` con Constitution Check v1.1.0
- [ ] Actualizar `.specify/templates/spec-template.md` con Noe-UX question
- [ ] Actualizar `.specify/templates/tasks-template.md` con smoke E2E obligatorio
- [ ] Definir 5 smoke tests Playwright como specs explicitas en plan V1
- [ ] Decidir threshold auto-send V1.5 (placeholder: score <40) con datos reales
