# Fase 3 · Tarea 1 — Onboarding (crear familia, unirse, invitar) · Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** que un usuario recién autenticado y sin familia pueda crear la suya con su bebé o unirse con un código de invitación, y que el propietario pueda invitar al otro progenitor (código visible una sola vez, con "Compartir" y "Generar otro").

**Architecture:** pantallas en `app/(auth)/join/*` y `app/(app)/settings/invite`, que componen Server Components con pequeñas islas cliente en `features/household/components/`. El backend de la Fase 2 (`createHousehold`, `joinHousehold`, `createHouseholdInvite`) se reutiliza sin cambios de esquema. Guarda `requireNoHousehold()` para las rutas de onboarding. Cache Components: cabecera estática al instante y todo lo que lee la sesión dentro de `<Suspense>`.

**Tech Stack:** Next.js 16.4 (`error.tsx` con `retry()`), React 19.3 (`useTransition`, `useSyncExternalStore`), React Hook Form + `zodResolver`, shadcn/ui sobre Base UI, Web Share API y Clipboard API, `@date-fns/tz`, Vitest 5. **Sin dependencias nuevas.**

**Spec:** [`CLAUDE.md`](../../../CLAUDE.md) §2.1, §2.4, §2.5, §4 y [`README.md` → Fase 3](../../../README.md) ("Pantallas de acceso…").

---

## Decisiones aprobadas (2026-10-08)

1. **Orden:** el onboarding se hace ahora (su backend está completo); después se vuelve a la Fase 2 para los esquemas, queries y acciones de los 5 módulos.
2. **Sexo del bebé:** no se pide en el onboarding (minimización de datos, RGPD). El esquema lo sigue admitiendo.
3. **Tras crear la familia:** redirección a `/` con la tarjeta "Invita al otro progenitor". No se bloquea al usuario.
4. **Piezas adelantadas:** `PageHeader`, `SubmitButton`, `FormFooter`, `useOnlineStatus` y `error.tsx` se construyen en esta tarea.

## Flujo

```
/login ─OTP─▶ "/" ─requireMember() sin familia─▶ /join
/join              Elegir: [Crear una familia] [Tengo un código] · Cerrar sesión
/join/create       Formulario → createHousehold → "/"
/join/code         Formulario → joinHousehold  → "/"
"/" (temporal)     Tarjeta "Invita al otro progenitor" mientras haya 1 miembro → /settings/invite
/settings/invite   Generar código · Compartir / Copiar · Generar otro
```

- El enlace compartido **nunca** contiene el código: es una credencial al portador y en una URL acabaría en el historial y en los logs (decisión 034).
- `createHouseholdInvite` revalida `revalidatePath("/settings", "layout")` para cubrir `/settings/invite` y la futura pantalla de Ajustes.

## Tareas (un commit atómico por tarea)

- [ ] **1. Guarda de onboarding** — `requireNoHousehold()` en `features/auth/session.ts` (+ 3 tests unit: sin sesión → `/login`; con familia → `/`; sin familia → `userId`). Commit `feat(auth): add requireNoHousehold guard for onboarding`.
- [ ] **2. Formato de fechas** — `formatDateInputValue(instant, tz)` → `"2026-10-08"` y `formatRelativeDayTime(instant, now, tz)` → "hoy a las 14:30" / "mañana a las 14:30" / "el 12/10 a las 14:30", con tests de cruce de medianoche en `Europe/Madrid`. Commit `feat(dates): add date input and relative day-time formatters`.
- [ ] **3. Cimientos de UI** — `components/layout/page-header.tsx` (título + Atrás de 48 px con `aria-label`), `components/shared/submit-button.tsx` (pendiente y sin conexión), `components/shared/form-footer.tsx` (pie fijo con *safe area*) y `lib/use-online-status.ts` (`useSyncExternalStore`, `online`/`offline`). Commit `feat(ui): add page header, submit button, form footer and online status`.
- [ ] **4. Errores** — `components/shared/error-state.tsx` y `error.tsx` en `(auth)` y `(app)` con `retry()` (API de Next 16.4). Commit `feat(ui): add error boundaries with retry`.
- [ ] **5. `/join`** — dos tarjetas-enlace grandes (Server Component, sin JS) + "Cerrar sesión", guarda dentro de `<Suspense>`. Commit `feat(household): add join landing with create and code options`.
- [ ] **6. `/join/create`** — `CreateHouseholdForm`: tu nombre, nombre del bebé y fecha de nacimiento (`max`/`min` calculados en el servidor en `APP_TIMEZONE`); UUID de familia y bebé generados una vez por formulario (idempotencia). Commit `feat(household): add create household screen`.
- [ ] **7. `/join/code`** — `JoinHouseholdForm`: código (Input normal, no `InputOTP`: 10 casillas no caben en 375 px y lo habitual es pegarlo) y tu nombre. Commit `feat(household): add join with invite code screen`.
- [ ] **8. `/settings/invite`** — estados: sin código, código pendiente no visible, código recién generado (Compartir / Copiar / Generar otro) y familia completa. `buildInviteMessage()` pura con test (el código nunca va en la URL). Commit `feat(household): add invite screen with share and regenerate`.
- [ ] **9. Inicio** — `InvitePartnerCard` en `/` mientras haya un solo miembro. Commit `feat(household): prompt to invite the other parent from home`.
- [ ] **10. Cierre** — `npm run typecheck`, `npm run lint`, `npm test`, `npm run format:check`, `npm run build`; roadmap y decisiones 046–048 en `CLAUDE.md`. Commit `docs: record onboarding decisions`.

## Textos de UI

| Pantalla | Textos |
|---|---|
| `/join` | **Prepara tu familia** · "Los dos veréis y registraréis lo mismo, cada uno en su móvil." · **Crear una familia**: "Eres el primero en usar la app." · **Tengo un código**: "Te lo ha enviado el otro progenitor." |
| Crear | **Crea tu familia** · Tu nombre: "Así sabrá el otro progenitor quién registró cada cosa." · CTA **Crear familia** / "Creando…" |
| Unirse | **Únete a tu familia** · Código: "10 letras y números, como ABCDE-FGHJK. Caduca a las 24 horas." · CTA **Unirme a la familia** / "Comprobando…" |
| Invitar | **Invita al otro progenitor** · "Con este código podrá ver y registrar todo desde su móvil." · "Vale 24 horas y para una sola persona." · **Compartir** · **Copiar código** → "Código copiado" · **Generar otro** |
| Mensaje compartido | "Únete a nuestra familia en Métricas Bebé: entra en {url} con tu email y, cuando te lo pida, escribe el código {code}. Caduca en 24 horas." |
| Error | **No hemos podido cargar esta pantalla** · "Revisa tu conexión y vuelve a intentarlo." · **Reintentar** |
| Sin conexión | "Sin conexión. Conéctate para continuar." |

## Verificación

- Unit: guarda, formateadores de fecha y mensaje de invitación. Sin tests de componentes (exigirían `@testing-library/react` + `jsdom`; decisión aparte).
- Navegador: 375 × 667 y 390 × 844, claro y oscuro; flujo con dos cuentas (una crea e invita, otra se une); comprobación con `SELECT` acotados vía MCP solo en dev.
- `crypto.randomUUID()` exige contexto seguro: para probar en un móvil por la red local, `next dev --experimental-https`.
