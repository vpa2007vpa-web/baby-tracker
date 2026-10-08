# Fase 2 · Tareas 4–9 — Backend de los 5 módulos de registro · Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** esquemas Zod, queries y Server Actions idempotentes y autorizadas de Pañales, Crecimiento, Salud, Sueño y Tomas, cronómetros seguros ante dos padres simultáneos y el resumen diario, todo probado contra PostgreSQL real.

**Architecture:** un módulo por dominio en `src/features/{diapers,growth,health,sleep,feeding}/` (`schemas.ts`, `queries.ts`, `actions.ts`, `service.ts` si hay lógica pura) y `features/dashboard/` para el resumen. Piezas comunes en `src/lib/` (`record-fields.ts` isomórfico, `records.ts` de servidor). Cada action: `requireMember()` → `safeParse` → `assertBabyInHousehold()` → Prisma → `revalidatePath` → `ActionResult`.

**Tech Stack:** Prisma 7.10 (índices únicos parciales, `updateMany`/`deleteMany` con filtro de relación, `$transaction`), Zod 4.6, `@date-fns/tz`, Vitest 5 (unit + integración contra `baby_tracker_test`). **Sin cambios de esquema ni dependencias nuevas.**

**Spec:** [`CLAUDE.md`](../../../CLAUDE.md) §2.3, §2.5, §2.6, §3.3, §3.4 y [`README.md` → Fase 2](../../../README.md).

---

## Decisiones aprobadas (2026-10-08)

1. **Zona horaria:** esquemas paramétricos (`diaperChangeSchemas(timeZone)`). El servidor pasa `env.APP_TIMEZONE`; la página pasa la zona al formulario como prop. En la Fase 3 los formularios usan `zodResolver(schema, undefined, { raw: true })`: envían el texto sin convertir y el servidor convierte una sola vez.
2. **Crecimiento:** entrada en kg y cm (coma decimal admitida), almacenamiento en g y mm enteros; la conversión vive en el esquema.
3. **Cronómetros:** solo se editan sesiones terminadas; una activa solo se puede parar (`CONFLICT` "Para la siesta antes de editarla").
4. **Borrado idempotente:** `ok` aunque el registro ya no exista (ajeno e inexistente indistinguibles).
5. **Pañal `WET`:** el color y la textura se descartan en silencio.
6. **Alcance:** bloques A, B y C, con una parada de revisión al final de cada bloque.

## Reglas comunes

- `localDateTime(timeZone)`: `"YYYY-MM-DDTHH:mm"` → `Date` en la zona del hogar; rechaza el futuro con 5 min de tolerancia (desfase de reloj entre móvil y servidor).
- Números de formulario: `""` → `undefined`; decimales con coma o punto.
- `notes`: recortadas, ≤ 500, vacías → `undefined`.
- Alta idempotente (`insertOnce`): ante `P2002`, si existe una fila con ese id **dentro de la familia** es un reintento (`ok`); si no, saltó otro índice único (`CONFLICT`).
- Edición y borrado en una sola sentencia acotada a la familia (`where: { id, baby: { householdId } }`): edición sin filas → `NOT_FOUND`; borrado siempre `ok`. Las ediciones guardan `updatedById` (gana la última escritura).
- Fecha omitida en un alta de un toque o en un inicio de cronómetro → hora del servidor.
- Revalidación tras cada mutación: `/` y la lista del módulo.
- Ids mal formados en queries de detalle → `null` (`isUuid`), nunca un error de Postgres.

## Contrato por módulo

| Módulo | Actions | Reglas | Queries |
|---|---|---|---|
| Pañales | `createDiaperChange`, `updateDiaperChange`, `deleteDiaperChange` | `occurredAt` opcional en el alta; `WET` descarta color y textura | `listDiaperChangesByDay`, `getDiaperChange`, `getLastDiaperChange` |
| Crecimiento | `createGrowthMeasurement`, `updateGrowthMeasurement`, `deleteGrowthMeasurement` | kg/cm → g/mm; al menos una medida; peso 0,5–30 kg, longitud 25–130 cm, perímetro craneal 20–60 cm | `listGrowthMeasurements` (máx. 100), `getGrowthMeasurement`, `getLatestGrowthMeasurement` |
| Salud | `createHealthRecord`, `updateHealthRecord`, `deleteHealthRecord` | nombre 1–80; dosis y unidad juntas; `doseNumber` 1–10 solo en `VACCINE`; reacción ≤ 500 | `listHealthRecords` (máx. 100), `getHealthRecord` |
| Sueño | `startSleepSession`, `stopSleepSession`, `createSleepSession`, `updateSleepSession`, `deleteSleepSession` | manual: fin > inicio, ≤ 16 h | `listSleepSessionsByDay` (solapamiento), `getSleepSession`, `getActiveSleepSession`, `getLastSleepSession` |
| Tomas | `startFeeding`, `stopFeeding`, `switchFeedingSide`, `createFeeding`, `updateFeeding`, `deleteFeeding` | biberón: 1–400 ml + contenido, sin fin; pecho manual: inicio y fin, ≤ 2 h | `listFeedingsByDay`, `getFeeding`, `getActiveFeeding`, `getLastFeeding`, `getLastBreastFeeding` |

**Cronómetros:** inicio con la hora del servidor (o `startedAt` para "−5/−15 min"); conflicto del índice parcial → `CONFLICT` "Ya hay una siesta en curso, iniciada por Ana" / "…por ti". Parada con `updateMany({ where: { id, endedAt: null, … } })`; sin filas → `ok` con el estado actual y `wasAlreadyStopped: true`. `switchFeedingSide` para la toma activa e inicia la contraria en una `$transaction`.

**Resumen diario:** `summarizeDay()` pura (tomas, ml, minutos de pecho; pañales total, mojados y sucios con `MIXED` en ambos; sueño) y `getDailySummary(babyId, day)`. Las sesiones que cruzan la medianoche se reparten por tramos; una activa cuenta hasta "ahora". Consultas por solapamiento acotadas a `started_at ∈ [inicio − 24 h, fin)` más la sesión activa.

## Tareas (un commit atómico por paso)

### Bloque A — Base y registros puntuales

- [x] A1 `test: share the session double across action tests`
- [x] A2 `feat(records): add shared field schemas` (`lib/record-fields.ts` + tests)
- [x] A3 `feat(records): add idempotent insert helper` (`lib/records.ts` + factories)
- [x] A4 Pañales: `feat(diapers): add diaper change schemas` → `…queries` → `…actions`
- [x] A5 Crecimiento: `feat(growth): add growth measurement schemas` → `…queries` → `…actions`
- [x] A6 Salud: `feat(health): add health record schemas` → `…queries` → `…actions`
- [x] ⏸ Parada A: `npm test`, `typecheck`, `lint`, revisión de código e informe.

### Bloque B — Cronómetros

- [x] B1 Sueño: schemas → queries → actions (+ concurrencia)
- [x] B2 Tomas: schemas → service (`suggestNextBreast`) → queries → actions (+ concurrencia y cambio de pecho)
- [x] ⏸ Parada B

### Bloque C — Resumen y cierre

- [x] C1 `feat(dashboard): add daily summary service` y `feat(dashboard): add daily summary query`
- [x] C2 `docs`: roadmap de la Fase 2 y decisiones 049–053 en `CLAUDE.md`

## Tests

| Nivel | Qué cubre |
|---|---|
| Unit | `record-fields` (zona, cambio de hora, tolerancia, coma, `""`); cada esquema (válido + una regla cruzada por caso); `suggestNextBreast`; `summarizeDay` (medianoche, días de 23/25 h, sesión activa, `MIXED`) |
| Integración por módulo | alta con `createdById`; mismo id dos veces en serie y en paralelo → 1 fila y 2 `ok`; bebé ajeno → `NOT_FOUND` sin fila; edición con `updatedById` y registro ajeno intacto; borrado idempotente; queries: límites del día en Madrid, solapamiento, aislamiento entre bebés, id mal formado → `null` |
| Concurrencia | dos inicios simultáneos → 1 activo + 1 `CONFLICT` con autor; dos paradas simultáneas → 2 `ok` y un solo `endedAt`; parada del otro progenitor; cambio de pecho atómico |

Objetivo: cada action con test de éxito, autorización y su conflicto propio; cada regla de esquema con su test.
