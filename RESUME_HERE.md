# RESUME_HERE — Hub ManIAcos Spec-Kit Workflow

**Ultima actualizacion**: 2026-05-24
**Branch activa**: `001-hub-marketing-v1`
**Estado**: Spec-kit COMPLETO — listo para implementar

---

## Estado actual del workflow

| Fase | Skill | Status | Artefacto |
|------|-------|--------|-----------|
| 0 | Setup | DONE | `specify` CLI v0.8.13 instalado |
| 1 | `/speckit-constitution` | DONE v1.1.0 | `.specify/memory/constitution.md` |
| 2 | `/speckit-specify` | DONE | `specs/001-hub-marketing-v1/spec.md` |
| 3 | `/speckit-clarify` | DONE | spec.md actualizado, 23 Q&A incorporados |
| 4 | `/speckit-plan` | DONE | `specs/001-hub-marketing-v1/plan.md` + research/data-model/contracts/quickstart |
| 5 | `/speckit-tasks` | DONE | `specs/001-hub-marketing-v1/tasks.md` — 128 tareas en 14 fases |
| 6 | `/speckit-taskstoissues` | DONE | 128 issues en `ManIAco-org/hub` (#22-#149) |

---

## Proxima accion: IMPLEMENTAR

```bash
# Ver issues abiertos en GitHub
# https://github.com/ManIAco-org/hub/issues

# Empezar por Phase 1 (Setup) — tareas T001-T012
# Ver tasks.md para orden y dependencias
```

**Orden de implementation recomendado** (ver `specs/001-hub-marketing-v1/tasks.md`):

1. Phase 1 Setup (T001-T012) — todo paralelizable
2. Phase 2 Foundation (T013-T039) — BLOQUEANTE para todo
3. Phase 3 US1 Login (T040-T043)
4. Phase 4 US2 Dashboard (T044-T049)
5. Phase 5 US3 Leads + Scraper (T050-T062)
6. Phase 6 US4 Enrichment (T063-T069)
7. Phase 7 US5 Writer (T070-T075)
8. Phase 8 US6 Approval Queue (T076-T083)
9. Phase 9 US7 Sender (T084-T089)
10. Phase 10 US8 Reply Handler (T090-T095)
11. Phase 11 US9 Analytics (T096-T100) — paralelo
12. Phase 12 US10 Vault UI (T101-T107) — paralelo desde Phase 2
13. Phase 13 US11 Coordinator (T108-T113)
14. Phase 14 Polish + Smoke Tests (T114-T128)

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
- Tasks: 128 (T001-T128) en 14 fases
- GitHub Issues: #22-#149 en ManIAco-org/hub
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

## Archivos clave

| Archivo | Descripcion |
|---------|-------------|
| `.specify/memory/constitution.md` | v1.1.0 — 9 principios, cost caps $200/$400 |
| `specs/001-hub-marketing-v1/spec.md` | Spec completa, 88 FRs, 0 markers |
| `specs/001-hub-marketing-v1/plan.md` | Tech stack, estructura, sprint plan |
| `specs/001-hub-marketing-v1/data-model.md` | Schema Postgres completo, 11 tablas |
| `specs/001-hub-marketing-v1/contracts/` | Webhooks, agent contracts, API routes |
| `specs/001-hub-marketing-v1/quickstart.md` | Dev setup guide, ~20 min |
| `specs/001-hub-marketing-v1/tasks.md` | 128 tareas implementables, paths exactos |
| `CLAUDE.md` | Runtime guidance para Claude Code |

---

## Deuda tecnica / TODO post-spec

- [ ] Actualizar `.specify/templates/plan-template.md` con Constitution Check v1.1.0
- [ ] Actualizar `.specify/templates/spec-template.md` con Noe-UX question
- [ ] Actualizar `.specify/templates/tasks-template.md` con smoke E2E obligatorio
- [ ] Decidir threshold auto-send V1.5 (placeholder: score <40) con datos reales
