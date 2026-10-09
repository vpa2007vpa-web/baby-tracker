# Fase 3 · Tarea 2 — Layout base (`BottomNav` y esqueleto de la app) · Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** navegación inferior fija (Hoy · Tomas · Pañales · Sueño · Más) y un esqueleto de pantallas autenticadas con contenedor móvil y *safe areas* de iOS, navegable de punta a punta.

**Architecture:** dos grupos de rutas bajo `(app)`: `(tabs)` con `BottomNav` y `(task)` sin barra. Layouts estáticos; cada página comprueba la sesión. La pestaña activa se lee con `useSelectedLayoutSegment()` en una hoja cliente envuelta en `<Suspense>`.

**Tech Stack:** Next.js 16.4 (grupos de rutas, Cache Components), Tailwind CSS 4 (variables CSS en valores arbitrarios), Lucide. **Sin dependencias nuevas.**

**Spec:** [`CLAUDE.md`](../../../CLAUDE.md) §2.1, §2.2, §4.1–§4.4 y [`README.md` → Fase 3](../../../README.md) ("Layout base").

---

## Decisiones aprobadas (2026-10-08)

1. **Opción A, dos grupos de rutas:** `(tabs)` (con barra) y `(task)` (sin barra). Alternativas descartadas: ocultar la barra por convención de rutas en el cliente (se suspende en `/[id]/edit` y parpadea) y barra siempre visible (formularios con menos altura y toques accidentales).
2. **"Más" es una pantalla (`/more`)** de tarjetas grandes, no un menú.
3. **Pantallas provisionales** con `EmptyState` para Tomas, Pañales, Sueño, Crecimiento, Salud y Ajustes.
4. **Hoy provisional:** saludo, invitación pendiente y "El resumen del día, muy pronto"; "Cerrar sesión" pasa a Más.

## Hallazgos de la documentación instalada

- Dos grupos pueden compartir segmento (`(tabs)/feeding` → `/feeding` y `(task)/feeding/new` → `/feeding/new`); solo está prohibido resolver a la misma URL.
- Con Cache Components, `usePathname`/`useSelectedLayoutSegment` en un layout se suspenden bajo parámetros dinámicos desconocidos: sin `<Suspense>`, el build falla.
- `calc()` en valores arbitrarios de Tailwind se escribe con `_` como espacio (`calc(env(safe-area-inset-top)_+_1.5rem)`); verificado en el CSS generado.

## Tareas (un commit atómico por tarea)

- [x] 1. `feat(layout): add bottom nav items and active tab matching` — `nav-items.ts` + tests de `getActiveNavItem`.
- [x] 2. `feat(layout): add bottom navigation bar` — `BottomNav` (Server) + `BottomNavLinks` (cliente) + `BottomNavList` (presentacional); `--bottom-nav-height`.
- [x] 3. `refactor(app): split authenticated screens into tab and task layouts` — layouts, `loading.tsx` y `error.tsx` por grupo; *safe area* superior en los tres layouts.
- [x] 4. `feat(ui): add empty state and module accents for link cards`.
- [x] 5. `feat(app): add the Más screen and placeholder module tabs`.
- [x] 6. `test(theme): guard the contrast of the bottom bar's neutral states` (el 3:1 de iconos de módulo ya existía desde la Fase 1).
- [x] 7. `docs`: decisión 054, estructura de carpetas y este plan.
- [x] Tras el QA visual: avisos por encima de la barra, revisión de accesibilidad (foco 3:1, `aria-current` de sección, movimiento reducido) y de código, y "Layout base" marcado en el roadmap.

## Verificación

- `npm test`, `typecheck`, `lint`, `format:check`, `build`.
- Navegador: 375 × 667 y 390 × 844, claro y oscuro; pestaña activa en cada ruta (Más en `/growth`, `/health`, `/settings`); contenido nunca tapado por la barra; foco visible; `/settings/invite` sin barra. Revisión con `design:accessibility-review`.
