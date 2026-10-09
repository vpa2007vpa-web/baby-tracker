# Fase 3 · Tarea 3 — UI del módulo Pañales · Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** registrar un pañal con un toque, añadir color y textura después y consultar el historial de cualquier día, con autoría, edición y borrado.

**Architecture:** `(tabs)/diapers` (historial del día con `?day=` y barra fija de un toque), `(task)/diapers/new` y `(task)/diapers/[id]/edit` (formulario compartido con `FormProvider`). Componentes compartidos nuevos: `ChoiceGrid`, `DateTimeField`, `DayNav`, `Textarea` (shadcn). Sin cambios de backend ni de esquema.

**Tech Stack:** Next.js 16.4, React 19 (`useTransition`), React Hook Form + `zodResolver(schema, undefined, { raw: true })`, `sonner`, Base UI `AlertDialog`, `date-fns` (`es`). **Sin dependencias nuevas.**

**Spec:** [`CLAUDE.md`](../../../CLAUDE.md) §2.4, §2.5, §4.2–§4.4 y [`README.md` → Fase 3](../../../README.md) ("Pañales").

---

## Decisiones aprobadas (2026-10-09)

1. Un toque registra los tres tipos; el color y la textura se añaden después.
2. Botones de un toque fijos sobre la `BottomNav`.
3. Navegación entre días con `?day=`.
4. Tokens `--stool-*` y opción "Sin indicar".
5. `Textarea` generado por shadcn.
6. Sin Testing Library: lógica pura con tests + QA en el navegador.

## Tareas

- [x] 1. `feat(dates): add datetime-local, day label and day param helpers`
- [x] 2. `feat(ui): add choice grid and textarea`
- [x] 3. `feat(ui): add date time field with shortcuts`
- [x] 4. `feat(ui): add day navigation`
- [x] 5. `feat(diapers): add labels, stool swatches and day counts`
- [x] 6. `feat(diapers): add one-tap buttons with undo`
- [x] 7. `feat(diapers): add the day history screen`
- [x] 8. `feat(diapers): add new and edit screens`
- [x] 9. `feat(diapers): delete from the edit screen`
- [x] 10. `feat(app): add not-found for task screens`
- [x] 11. `docs`: decisiones 056–057 y este plan
- [x] Tras el QA visual: revisión de accesibilidad (confirmación de borrado a 4,5:1, nombres de los atajos de hora), del sistema de diseño (guarda de los tokens `--stool-*`) y de código, y "Pañales" marcado en el roadmap.

## Verificación

- `npm test`, `typecheck`, `lint`, `format:check`, `build`; clases nuevas comprobadas en el CSS generado.
- Navegador a 375 × 667 y 390 × 844, claro y oscuro: un toque crea y "Deshacer" borra; un doble toque rápido crea uno solo (comprobado con un `SELECT` acotado vía MCP en dev); añadir detalle, editar, borrar, navegar entre días, registro inexistente → "No hemos encontrado ese registro".
