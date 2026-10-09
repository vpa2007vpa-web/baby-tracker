# Fase 3 · Tarea 5 — UI del módulo Sueño · Plan de implementación

**Goal:** cronómetro de sueño compartido (iniciar ahora o «hace 5 / 10 / 15 min», parar), alta manual, historial con `?day=` y edición o borrado solo de siestas terminadas.

**Spec:** [`CLAUDE.md`](../../../CLAUDE.md) §2.4, §2.5, §4.2–§4.4 y [`README.md` → Fase 3](../../../README.md) ("Sueño"). Sin dependencias nuevas.

## Decisiones aprobadas (2026-10-09)

1. Barra fija con dos estados, como en Tomas.
2. Extraer `StickyActionBar` y `ElapsedTime` a `components/shared`.
3. Inicio tardío rápido (opción A): «hace 5 / 10 / 15 min» bajo «Iniciar siesta», calculado en el servidor (`minutesAgo`).

## Tareas

- [x] 1. `feat(sleep): start a sleep a few minutes ago on the server clock`
- [x] 2. `refactor(ui): share the sticky action bar`
- [x] 3. `refactor(ui): move the elapsed timer to shared components`
- [x] 4. `refactor(dashboard): export the sleep summary`
- [x] 5. `fix(ui): lift the toasts by the sticky bar's real height`
- [x] 6. `feat(sleep): add labels and quick late starts`
- [x] 7. `feat(sleep): add the sleep timer bar`
- [x] 8. `feat(sleep): add the day history screen`
- [x] 9. `feat(sleep): add new, edit and delete screens`
- [x] 10. `docs`: decisión 062 y este plan
- [ ] Tras el QA con dos sesiones: revisiones de accesibilidad, código y sistema de diseño, y "Sueño" marcada en el roadmap.

## Verificación

- `npm test` (425), `typecheck`, `lint`, `format`, `build`.
- Dos sesiones: A inicia «hace 10 min» y el aviso dice la hora guardada; B la ve al volver y la para; dos inicios simultáneos → un cronómetro y conflicto con autor; parar y empezar «hace 15 min» enseguida → empieza al final de la anterior; Deshacer; editar y borrar; noche que cruza la medianoche en los dos días; foco tras iniciar/parar con teclado (también en Tomas); avisos por encima de la barra en curso (también en Tomas); 375 px claro y oscuro.
