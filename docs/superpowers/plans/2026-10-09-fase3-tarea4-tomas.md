# Fase 3 · Tarea 4 — UI del módulo Tomas (pecho y biberón) · Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** un cronómetro de pecho compartido por ambos padres (iniciar, cambiar de pecho, parar), biberón en dos toques con la última cantidad, sugerencia del siguiente pecho e historial del día.

**Architecture:** `(tabs)/feeding` con una barra fija de dos estados (`BreastTimerBar`: botones o toma en curso) e historial por `?day=`; `(task)/feeding/new` y `(task)/feeding/[id]/edit` con un formulario único (unión discriminada por tipo). `RefreshOnFocus` en `(app)/layout.tsx`. Piezas extraídas de Pañales: `useSingleFlight`, `offerUndo`, `DeleteRecordButton`.

**Tech Stack:** Next.js 16.4, React 19 (`useTransition`, efectos con limpieza), React Hook Form con uniones discriminadas, `sonner`, Base UI. **Sin dependencias nuevas.** Backend: `getLastBottleFeeding` y `summarizeFeedings` exportado.

**Spec:** [`CLAUDE.md`](../../../CLAUDE.md) §2.4, §2.8, §4.2–§4.4 y [`README.md` → Fase 3](../../../README.md) ("Alimentación").

---

## Decisiones aprobadas (2026-10-09)

1. Barra fija con dos estados (sin toma / en curso).
2. Biberón en dos toques con formulario precargado (`getLastBottleFeeding`).
3. Formulario único con el tipo como selector.
4. `RefreshOnFocus` (visibilidad y red) antes de `RealtimeSync`.
5. Extraer `useSingleFlight`, `offerUndo` y `DeleteRecordButton`.

## Tareas

- [x] 1. `feat(dates): add elapsed time helpers`
- [x] 2. `refactor(dashboard): export the feeding summary`
- [x] 3. `feat(feeding): add the last bottle query`
- [x] 4. `feat(ui): add number stepper`
- [x] 5. `refactor(ui): share the double-tap guard, undo toast and delete confirmation`
- [x] 6. `feat(feeding): add labels and quick bottle amounts`
- [x] 7. `feat(feeding): add the breast timer bar`
- [x] 8. `feat(feeding): add the day history screen`
- [x] 9. `feat(feeding): add new and edit screens`
- [x] 10. `feat(feeding): delete from the edit screen`
- [x] 11. `feat(app): refresh tab screens when they come back into view`
- [x] 12. `docs`: decisiones 059–060 y este plan
- [x] Tras el QA con dos sesiones: revisiones de accesibilidad, código y sistema de diseño, y "Alimentación" marcada en el roadmap. *(Correcciones: foco tras cambiar los botones de la barra y unidad en el nombre de `NumberStepper`; decisión 061.)*

## Verificación

- `npm test`, `typecheck`, `lint`, `format:check`, `build`.
- Dos sesiones a la vez (dos navegadores, Ana y Luis): Ana inicia y Luis ve la toma en marcha al volver a la pantalla y la para; dos inicios simultáneos dan un solo cronómetro y un aviso de conflicto con autor; cambiar de pecho; biberón en dos toques; 375 px, claro y oscuro.
