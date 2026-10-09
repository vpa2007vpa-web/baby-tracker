# Fase 3 · Tarea 6 — Sprint final: Crecimiento, Salud y Ajustes · Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** cerrar la Fase 3 con tres pantallas de formularios CRUD sin cronómetros (Crecimiento, Salud y Ajustes de familia), los estados `loading` / `error` / `not-found` que faltan y la revisión global de accesibilidad.

**Architecture:** Crecimiento y Salud cuelgan de Más dentro de `(tabs)`, con un historial de servidor (los 100 últimos, sin `?day=`: son registros espaciados en semanas) y un botón fijo «Añadir…». Sus altas y ediciones viven en `(task)/growth/*` y `(task)/health/*` con el patrón de Tomas y Sueño: `XFields` con `FormProvider`, `zodResolver(schema, undefined, { raw: true })`, `applyFieldErrors`, `offerUndo` y `DeleteRecordButton`. Ajustes compone Server Components con dos islas cliente: el selector de tema y la expulsión de un miembro. Única concurrencia: el doble toque (UUID por formulario + `insertOnce`) y, en Ajustes, una transacción con `SELECT … FOR UPDATE` como la del canje de invitaciones (ADR-043).

**Tech Stack:** Next.js 16.4, React 19, React Hook Form + Zod 4, `next-themes` (ya instalado, decisión 022), Base UI. **Sin dependencias nuevas, sin migraciones**: el esquema y las acciones CRUD de Crecimiento y Salud ya existen (Fase 2). Solo hay backend nuevo en Ajustes.

**Spec:** [`CLAUDE.md`](../../../CLAUDE.md) §2.3, §2.7, §4.2–§4.4 y [`README.md` → Fase 3](../../../README.md) («Crecimiento», «Vacunas / Salud», «Ajustes de familia», estados por segmento y revisión de accesibilidad).

---

## Punto de partida

| Módulo | Backend existente | Falta |
|---|---|---|
| Crecimiento | `create/update/deleteGrowthMeasurement`, `listGrowthMeasurements` (100), `getGrowthMeasurement`, `getLatestGrowthMeasurement`; entrada en kg/cm y almacenamiento en g/mm (decisión 052) | Toda la UI y el formato «5,25 kg» / «56,5 cm» |
| Salud | `create/update/deleteHealthRecord`, `listHealthRecords` (100), `getHealthRecord`; dosis con unidad obligatoria, `doseNumber` descartado en medicamentos (decisión 050) | Toda la UI; consulta de medicamentos recientes (decisión B) |
| Ajustes | `listHouseholdMembers`, `getPendingInvite`, `createHouseholdInvite` (revoca los pendientes), `/settings/invite`, `SignOutButton` | `removeHouseholdMember`, `revokeHouseholdInvite` y la pantalla |

## Decisiones propuestas (pendientes de aprobación)

1. **Sin días:** Crecimiento y Salud son historiales completos (los 100 últimos), sin `DayNav`.
2. **Acción principal fija:** un único botón «Añadir medida» / «Añadir registro» en una `StickyActionBar` (zona del pulgar, avisos por encima). Son pantallas de pestaña, así que el botón no puede ir en `FormFooter`.
3. **Campos decimales:** nuevo `UnitField` compartido (texto con `inputMode="decimal"`, coma admitida, unidad dibujada a la derecha y repetida como texto oculto en la etiqueta, decisión 061). `NumberStepper` no encaja con pesos en kg (pasos de 10 g); sí con el número de dosis.
4. **A. Crecimiento, variación de peso:** cada medida con peso muestra la diferencia con el peso anterior («+350 g en 14 días»), calculada con una función pura (`describeWeightChange`). Sin gráficas ni percentiles (backlog).
5. **B. Salud, repetir un medicamento:** el formulario de alta muestra como botones los 4 últimos medicamentos distintos («Apiretal · 2,5 ml»). Un toque rellena nombre, dosis y unidad del último registro con ese nombre (mismo espíritu que «última cantidad de biberón», §4.2). Nueva query `listRecentMedications` (los registros `MEDICATION` más recientes, uno por nombre).
6. **C. Ajustes, expulsar:** solo el `OWNER` puede expulsar, nunca a sí mismo. En una transacción se borra al `HouseholdMember` y se **revocan las invitaciones pendientes** (es la respuesta a un código filtrado). Sus registros se conservan y su autoría pasa a no mostrarse (`authorLabel` → `null`, como hoy con un antiguo miembro). Es idempotente: si ya no está, `ok`. Si la persona expulsada sigue con la app abierta, su siguiente petición pasa por `requireMember()` y va a `/join`.
7. **Anular el código:** `revokeHouseholdInvite` con el mismo permiso que generar uno, para invalidar un código filtrado sin generar otro.
8. **Tema manual:** un `ChoiceGrid` con Sistema · Claro · Oscuro sobre `useTheme()`. Se pinta tras el montaje (`useSyncExternalStore`) para no desajustar la hidratación.
9. **Refactor previo (regla de tres):** la fila de historial (hora · icono · título · detalles · «por Ana» · enlace o fila inerte) está copiada en Pañales, Tomas y Sueño, y Crecimiento y Salud serían la cuarta y la quinta copia. Se extrae `RecordHistoryItem` a `components/shared`. También se extraen `authorNamesOf(members)` (en 6 páginas) y `dayNavHrefs()` (en 3).

## Tareas

### 0. Base compartida
- [x] 1. `refactor(ui): share the record history row`: `RecordHistoryItem`; migrar Pañales, Tomas y Sueño sin cambiar el marcado visible.
- [x] 2. `refactor(app): share author names and day navigation links`: `authorNamesOf` en `lib/authors.ts` y `dayNavHrefs` en `lib/dates.ts`, con tests.
- [x] 3. `feat(ui): add unit field`: `UnitField` (decimal, unidad en el nombre accesible).

### 1. Crecimiento
- [x] 4. `feat(growth): add labels and formatting`: `formatWeight` («5,25 kg»), `formatLength` («56,5 cm»), conversión de g/mm a texto de formulario («5,25») y `describeWeightChange`, todo con tests (redondeo, coma y signo).
- [x] 5. `feat(growth): add the history screen`: `/growth` con la última medida destacada, el historial con autoría y la `StickyActionBar` «Añadir medida»; estado vacío.
- [x] 6. `feat(growth): add new, edit and delete screens`: `GrowthFields` (fecha y hora, peso, longitud, perímetro), error «Indica al menos una medida» bajo el peso, Deshacer, `DeleteRecordButton`.

### 2. Salud
- [x] 7. `feat(health): add the recent medications query`: `listRecentMedications(babyId, 4)` con test de integración (orden, distintos, otra familia invisible).
- [x] 8. `feat(health): add labels`: tipo, unidades (ml · mg · gotas · inhalaciones), «2.ª dosis» y formato de dosis («2,5 ml»), con tests exhaustivos sobre los enums.
- [x] 9. `feat(health): add the history screen`: `/health` con icono y texto por tipo (`Syringe` / `Pill`), dosis, número de dosis y la reacción marcada con icono y texto («Reacción: fiebre»), nunca solo con color.
- [x] 10. `feat(health): add new, edit and delete screens`: `HealthFields` (tipo en `ChoiceGrid`, nombre, dosis y unidad juntas, `NumberStepper` de dosis solo en vacunas, fecha, reacción y notas), botones de medicamentos recientes en el alta, «Guardar vacuna» / «Guardar medicamento».

### 3. Ajustes
- [x] 11. `feat(household): remove a member and revoke invites`: `removeHouseholdMember` y `revokeHouseholdInvite` según las decisiones 6 y 7. Tests de integración: solo el OWNER, nunca a sí mismo, otra familia → `NOT_FOUND`, idempotencia, revocación de pendientes, expulsar y unirse a la vez → estado coherente. Prueba de mutación de la comprobación de rol.
- [x] 12. `feat(settings): add the family and appearance screen`: `/settings` con Familia (miembros, «tú», rol, invitación activa «hasta las 14:30» con «Anular código» o enlace a invitar), Expulsar (`AlertDialog` en rojo sólido), Apariencia (tema) y Cuenta (cerrar sesión).

### 4. Cierre de la Fase 3
- [x] 13. `feat(app): add loading and not-found states to every segment`: `not-found.tsx` en `(tabs)` y `(auth)`; `loading.tsx` donde una página no tenga ya su `Suspense` con *skeleton*.
- [x] 14. `docs`: decisiones nuevas, este plan, casillas del README («Crecimiento», «Vacunas / Salud», «Ajustes», «Autoría», «Editar y borrar», «Estados»).
- [x] Tras el QA con dos sesiones *(Crecimiento, Salud y Ajustes superados; revisión global de accesibilidad el 2026-10-09)*: `design:accessibility-review` **global** (casilla «Revisión de accesibilidad»), `engineering:code-review`, `design:design-system`; correcciones y cierre de la Fase 3.

## Skills por tarea (regla 0.1)

`design:ux-copy` en las tareas 4, 8, 10 y 12. `engineering:testing-strategy` en las 7 y 11. `superpowers:test-driven-development` en todas las funciones puras y acciones. `engineering:code-review`, `design:accessibility-review` y `design:design-system` al cerrar. Ajustes es lo único con autorización nueva, así que la tarea 11 pasa además por `security-review`.

## Verificación

- `npm test`, `typecheck`, `lint`, `format`, `build`, sin `| tail` que oculte códigos de salida.
- Navegador a 375 px, claro y oscuro: alta, edición, borrado y Deshacer en Crecimiento y Salud; la coma decimal («4,85»); el error «al menos una medida»; el número de dosis que desaparece al cambiar a Medicamento; repetir un medicamento en un toque.
- Dos sesiones: el OWNER expulsa al MEMBER y el expulsado, al volver a la app, acaba en `/join`; un código anulado ya no sirve; el tema elegido sobrevive a recargar.
- Sin migraciones: no hace falta verificación vía MCP salvo depuración.
