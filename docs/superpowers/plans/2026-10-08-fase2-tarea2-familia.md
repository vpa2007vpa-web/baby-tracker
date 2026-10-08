# Fase 2 · Tarea 2 — Gestión de la familia · Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** que un usuario recién registrado pueda crear su familia con su bebé, generar un código de invitación seguro, de un solo uso y con caducidad, y que el otro progenitor se una con ese código; todo como Server Actions autorizadas, validadas y probadas contra PostgreSQL real.

**Architecture:** módulo `src/features/household/` (schemas, invite-code, service, queries, actions). El código de invitación se genera con el CSPRNG de Node, se muestra **una sola vez** y en la base de datos solo se guarda su hash SHA-256. El canje es atómico dentro de una transacción interactiva que bloquea la fila de la familia (`SELECT … FOR UPDATE`), de modo que dos canjes simultáneos del mismo código producen exactamente un miembro. Las pantallas (`/join` como entrada, crear familia, unirse con código) son de la Fase 3; aquí solo se construye y prueba el backend.

**Tech Stack:** Next.js 16.4 Server Actions, Prisma 7.10 (transacciones interactivas), Zod 4.6 (`z.iso.date()`), `node:crypto` (`randomInt`, `createHash`), `@date-fns/tz`, Vitest 5 (unit + integración contra `baby_tracker_test`). **Sin dependencias nuevas.**

**Spec:** [`CLAUDE.md`](../../../CLAUDE.md) §2.3, §2.6, §2.7, §3.3, §3.4 y [`README.md` → Fase 2](../../../README.md) ("Familia: crear familia y bebé, generar código de invitación (con caducidad) y unirse con código").

---

## ADR-043: Códigos de invitación a la familia

**Status:** Accepted · **Date:** 2026-10-08 · **Deciders:** Vicente

### Context

El código es una credencial al portador: quien lo canjea pasa a ver los datos de salud de un menor. Lo teclea o recibe por mensajería el otro progenitor, a menudo desde el móvil. Restricciones: sin dependencias nuevas, sin infraestructura adicional (no hay Redis para limitar intentos), Prisma ignora RLS y el esquema actual guarda `HouseholdInvite.code` en texto plano con índice único.

### Decision

| Aspecto | Decisión |
|---|---|
| Alfabeto | Crockford Base32: `0123456789ABCDEFGHJKMNPQRSTVWXYZ` (sin I, L, O ni U: nada ambiguo al teclear o dictar) |
| Longitud | 10 caracteres → 32¹⁰ ≈ 1,1·10¹⁵ combinaciones (50 bits) |
| Formato visible | `ABCDE-FGHJK`; al canjear se aceptan minúsculas, espacios y guiones, y `O→0`, `I/L→1` |
| Generación | `crypto.randomInt(0, 32)` por carácter: CSPRNG del sistema y sin sesgo de módulo |
| Almacenamiento | Solo `SHA-256(código normalizado)` en `code_hash` (único); el código se devuelve una única vez al crearlo |
| Caducidad | 24 h desde su creación |
| Uso | Un solo uso (`usedAt`, `usedById`); generar un código nuevo borra los pendientes de esa familia |
| Miembros | Máximo 2 por familia (los dos progenitores; cuidadores y abuelos están en el backlog) |
| Canje | Transacción interactiva: buscar invitación vigente → `FOR UPDATE` de la familia → reclamar con `updateMany(where usedAt = null)` → comprobar el cupo → crear el miembro |
| Errores | Código desconocido, caducado o usado → la **misma** respuesta (`VALIDATION`) |

### Options Considered

**Almacenamiento**

| Opción | Pros | Contras |
|---|---|---|
| A. Texto plano (esquema actual) | Sin migración; el dueño puede volver a ver el código | Cualquiera con acceso de lectura (panel, *backups*, logs de consultas) puede unirse a la familia |
| **B. SHA-256 sin sal** | Una fuga de la tabla no da códigos usables; sin secretos que gestionar; búsqueda por índice único | Requiere migración (renombrar columna); el código solo se ve al crearlo |
| C. HMAC-SHA-256 con *pepper* | Resiste fuerza bruta *offline* incluso con la base de datos filtrada | Un secreto más que rotar y desplegar; con acceso a la base de datos el atacante ya tiene los datos que el código protege |

**Caducidad:** 24 h (recomendada: la exposición mínima que cubre "te lo mando y lo metes esta noche") · 72 h · 7 días.

**Miembros:** máximo 2 (recomendado: un código filtrado después de que se una la pareja no sirve de nada) · sin límite.

### Trade-off Analysis

- **Fuerza bruta online:** 50 bits y 24 h de vida hacen inútil adivinar; incluso a 1.000 intentos/s durante 24 h la probabilidad de acertar un código vigente es ≈ 8·10⁻⁸. Además, cada intento exige una sesión de Supabase Auth. No hace falta limitar intentos con infraestructura nueva.
- **Hash frente a HMAC:** quien lee la tabla de invitaciones ya puede leer las tomas y pañales que el código protege; el *pepper* solo añadiría gestión de secretos. SHA-256 basta para que el código no sea reutilizable desde una vista de la tabla, un *backup* o un log.
- **Mostrar una sola vez:** si el dueño pierde el código genera otro (un toque). Es el patrón habitual de los tokens de acceso.

### Consequences

- Más fácil: razonar sobre fugas (ningún artefacto guardado sirve para entrar); canjes concurrentes deterministas.
- Más difícil: no se puede "volver a ver" un código; la UI de la Fase 3 debe ofrecer "Compartir" y "Generar otro".
- A revisar: expulsar a un miembro (si un código se filtra **antes** de que se una la pareja) no está en el alcance; queda propuesto para Ajustes en la Fase 3.

---

## Global Constraints

- Sin dependencias nuevas.
- Cada Server Action sigue la plantilla de CLAUDE.md §2.3: entrada `unknown`, sesión, Zod en el servidor, autorización, `handleActionError`, `redirect()` fuera del `try/catch`, `revalidatePath`.
- Altas idempotentes con UUID generados en el cliente (`householdId`, `babyId`).
- El código de invitación en claro **nunca** se guarda, se registra en logs ni aparece en mensajes de error.
- Respuestas idénticas para código desconocido, caducado o ya usado.
- Textos de UI y de error en español, tuteando; código e identificadores en inglés.
- El esquema solo cambia con Prisma Migrate y se verifica vía MCP (regla 0.2), también en `baby_tracker_test` (`npm run test:db`).
- Commits atómicos en inglés al cerrar cada tarea.

## Review Focus

1. **Canje simultáneo del mismo código por dos personas:** exactamente un miembro nuevo; el otro recibe "código no válido" → Task 7, test concurrente.
2. **Familia completa:** con 2 miembros no se puede generar código ni canjear uno antiguo → Task 7.
3. **Usuario que ya tiene familia intenta unirse a otra:** `CONFLICT` y su pertenencia original intacta → Task 7.
4. **Doble toque en "Crear familia":** una sola familia, sin error → Task 6.
5. **Código tecleado a mano en el móvil** (minúsculas, espacios, guiones, `O` por `0`): se acepta → Task 2 y Task 7.

---

### Task 1: Migración — `code` → `code_hash`

**Files:**
- Modify: `prisma/schema.prisma` (modelo `HouseholdInvite`)
- Create: `prisma/migrations/<timestamp>_invite_code_hash/migration.sql`

- [ ] **Step 1: Esquema**

```prisma
model HouseholdInvite {
  id          String    @id @default(uuid()) @db.Uuid
  householdId String    @map("household_id") @db.Uuid
  /// SHA-256 (hex) of the normalized code. The plain code is shown once and never stored.
  codeHash    String    @unique @map("code_hash")
  expiresAt   DateTime  @map("expires_at") @db.Timestamptz(3)
  usedAt      DateTime? @map("used_at") @db.Timestamptz(3)
  usedById    String?   @map("used_by_id") @db.Uuid
  createdById String    @map("created_by_id") @db.Uuid
  createdAt   DateTime  @default(now()) @map("created_at") @db.Timestamptz(3)
  updatedAt   DateTime  @updatedAt @map("updated_at") @db.Timestamptz(3)

  household Household @relation(fields: [householdId], references: [id], onDelete: Cascade)

  @@index([householdId])
  @@map("household_invites")
}
```

- [ ] **Step 2: Crear la migración sin aplicarla y convertirla en un *rename***

```bash
npx prisma migrate dev --create-only --name invite_code_hash
```

Prisma genera `DROP COLUMN code` + `ADD COLUMN code_hash` (destructivo). Se sustituye el contenido de `migration.sql` por:

```sql
-- Store only a SHA-256 hash of invite codes (ADR-043). Rename instead of
-- drop/add so no row is lost; any pre-existing plain code stops matching,
-- which is the intended invalidation.
ALTER TABLE "household_invites" RENAME COLUMN "code" TO "code_hash";
ALTER INDEX "household_invites_code_key" RENAME TO "household_invites_code_hash_key";
```

- [ ] **Step 3: Aplicar en dev y en la base de test**

```bash
npx prisma migrate dev
npm run test:db
npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script
```

Expected: migración aplicada; `test:db` la aplica en `baby_tracker_test`; el *diff* sale vacío.

- [ ] **Step 4: Verificación vía MCP (regla 0.2, proyecto dev)**

`_prisma_migrations` con las 2 migraciones terminadas; `household_invites` tiene `code_hash` y no `code`; índice único `household_invites_code_hash_key`; RLS y política de `household_invites` intactas; *advisors* de seguridad y rendimiento sin avisos nuevos.

- [ ] **Step 5: Commit** — `feat(db): store invite codes as SHA-256 hashes`

---

### Task 2: Dominio del código de invitación

**Files:**
- Create: `src/features/household/invite-code.ts` (isomórfico), `src/features/household/invite-code.test.ts`
- Create: `src/features/household/service.ts` (servidor), `src/features/household/service.test.ts`

**Interfaces:**
- Produces (isomórfico): `INVITE_CODE_ALPHABET`, `INVITE_CODE_LENGTH = 10`, `normalizeInviteCode(raw: string): string | null`, `formatInviteCode(code: string): string`
- Produces (servidor): `INVITE_TTL_MS`, `MAX_HOUSEHOLD_MEMBERS = 2`, `generateInviteCode(randomIndex?: (max: number) => number): string`, `hashInviteCode(code: string): string`, `getInviteExpiry(now: Date): Date`

- [ ] **Step 1: Tests (rojo)**

`src/features/household/invite-code.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { formatInviteCode, normalizeInviteCode } from "@/features/household/invite-code";

describe("normalizeInviteCode", () => {
  it.each([
    ["ABCDE-FGHJK", "ABCDEFGHJK"],
    ["abcde fghjk", "ABCDEFGHJK"],
    [" a b c d e - f g h j k ", "ABCDEFGHJK"],
    ["0O1IL-23456", "0011123456"], // Crockford: O→0, I/L→1
  ])("reads %j as %j", (raw, expected) => {
    expect(normalizeInviteCode(raw)).toBe(expected);
  });

  it.each(["", "ABCDE", "ABCDE-FGHJKM", "ABCDE-FGHJU", "ABCDE-FGH*K"])("rejects %j", (raw) => {
    expect(normalizeInviteCode(raw)).toBeNull();
  });
});

describe("formatInviteCode", () => {
  it("groups the code in two blocks for reading aloud", () => {
    expect(formatInviteCode("ABCDEFGHJK")).toBe("ABCDE-FGHJK");
  });
});
```

`src/features/household/service.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { INVITE_CODE_ALPHABET, INVITE_CODE_LENGTH } from "@/features/household/invite-code";
import { generateInviteCode, getInviteExpiry, hashInviteCode } from "@/features/household/service";

describe("generateInviteCode", () => {
  it("draws every character from the alphabet with the injected random source", () => {
    const draws: number[] = [];
    const code = generateInviteCode((max) => {
      draws.push(max);
      return draws.length % max;
    });
    expect(code).toHaveLength(INVITE_CODE_LENGTH);
    expect(draws).toEqual(Array.from({ length: INVITE_CODE_LENGTH }, () => 32));
    expect(code).toBe("123456789A");
  });

  it("only produces alphabet characters with the real CSPRNG", () => {
    const codes = Array.from({ length: 200 }, () => generateInviteCode());
    for (const code of codes) {
      expect([...code].every((char) => INVITE_CODE_ALPHABET.includes(char))).toBe(true);
    }
    expect(new Set(codes).size).toBe(codes.length);
  });
});

describe("hashInviteCode", () => {
  it("is a deterministic SHA-256 hex digest that never contains the code", () => {
    const hash = hashInviteCode("ABCDEFGHJK");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hashInviteCode("ABCDEFGHJK")).toBe(hash);
    expect(hash).not.toContain("ABCDEFGHJK".toLowerCase());
  });
});

describe("getInviteExpiry", () => {
  it("expires 24 hours after creation", () => {
    expect(getInviteExpiry(new Date("2026-10-08T12:00:00Z")).toISOString()).toBe("2026-10-09T12:00:00.000Z");
  });
});
```

- [ ] **Step 2: `invite-code.ts` (verde)**

```ts
// Isomorphic: the join form normalizes what the user types before submitting.

/** Crockford Base32: no I, L, O or U, so nothing is ambiguous when typed or read aloud. */
export const INVITE_CODE_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
export const INVITE_CODE_LENGTH = 10;

const CROCKFORD_ALIASES: Record<string, string> = { O: "0", I: "1", L: "1" };

/** Accepts lowercase, spaces, hyphens and Crockford aliases; null when invalid. */
export function normalizeInviteCode(raw: string): string | null {
  const code = [...raw.toUpperCase().replace(/[\s-]/g, "")]
    .map((char) => CROCKFORD_ALIASES[char] ?? char)
    .join("");
  const isValid =
    code.length === INVITE_CODE_LENGTH &&
    [...code].every((char) => INVITE_CODE_ALPHABET.includes(char));
  return isValid ? code : null;
}

/** "ABCDEFGHJK" → "ABCDE-FGHJK". */
export function formatInviteCode(code: string): string {
  const half = INVITE_CODE_LENGTH / 2;
  return `${code.slice(0, half)}-${code.slice(half)}`;
}
```

- [ ] **Step 3: `service.ts` (verde)**

```ts
import "server-only";

import { createHash, randomInt } from "node:crypto";

import { INVITE_CODE_ALPHABET, INVITE_CODE_LENGTH } from "@/features/household/invite-code";

/** ADR-043: short exposure that still covers "I'll send it, enter it tonight". */
export const INVITE_TTL_MS = 24 * 60 * 60 * 1000;
/** ADR-043: the two parents. Caregivers with limited access are in the backlog. */
export const MAX_HOUSEHOLD_MEMBERS = 2;

/**
 * 50 bits from the OS CSPRNG. `randomInt` rejects biased samples, so every
 * character is uniform; the parameter only exists for deterministic tests.
 */
export function generateInviteCode(
  randomIndex: (max: number) => number = (max) => randomInt(0, max),
): string {
  return Array.from(
    { length: INVITE_CODE_LENGTH },
    () => INVITE_CODE_ALPHABET.charAt(randomIndex(INVITE_CODE_ALPHABET.length)),
  ).join("");
}

/** Only this hash is stored: a leaked table or log never yields a usable code. */
export function hashInviteCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

export function getInviteExpiry(now: Date): Date {
  return new Date(now.getTime() + INVITE_TTL_MS);
}
```

- [ ] **Step 4: Verde** — `npm run test:unit`.

- [ ] **Step 5: Commit** — `feat(household): add secure invite code generation`

---

### Task 3: Fechas sin hora y *schemas* del módulo

**Files:**
- Modify: `src/lib/dates.ts`, `src/lib/dates.test.ts`
- Create: `src/features/household/schemas.ts`, `src/features/household/schemas.test.ts`

**Interfaces:**
- Produces: `parseDateOnly(value: string, timeZone: string): Date | null` (medianoche local); `createHouseholdSchema`, `CreateHouseholdInput`; `joinHouseholdSchema`, `JoinHouseholdInput`.

- [ ] **Step 1: Tests de `parseDateOnly` (rojo)** — en `dates.test.ts`:

```ts
describe("parseDateOnly", () => {
  it("reads <input type=date> values as local midnight in the household zone", () => {
    expect(parseDateOnly("2026-08-27", MADRID)?.toISOString()).toBe("2026-08-26T22:00:00.000Z");
    expect(parseDateOnly("2026-01-15", MADRID)?.toISOString()).toBe("2026-01-14T23:00:00.000Z");
  });

  it.each(["", "2026-02-31", "27/08/2026", "2026-08-27T10:00"])("rejects %j", (value) => {
    expect(parseDateOnly(value, MADRID)).toBeNull();
  });
});
```

- [ ] **Step 2: `parseDateOnly` (verde)** — en `dates.ts`:

```ts
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** `<input type="date">` value → midnight of that day in `timeZone`; null if invalid. */
export function parseDateOnly(value: string, timeZone: string): Date | null {
  const match = DATE_ONLY.exec(value);
  if (!match) return null;
  return parseDateTimeLocal(`${value}T00:00`, timeZone);
}
```

- [ ] **Step 3: Tests de *schemas* (rojo)** — `schemas.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createHouseholdSchema, joinHouseholdSchema } from "@/features/household/schemas";

// Pin the clock: the birth date rules are relative to "now".
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-08T12:00:00Z"));
});
afterEach(() => {
  vi.useRealTimers();
});

const VALID_HOUSEHOLD = {
  householdId: "5eed0000-0000-4000-8000-000000000001",
  babyId: "5eed0000-0000-4000-8000-000000000002",
  displayName: "  Ana ",
  babyName: "Lucía",
  babyBirthDate: "2026-08-27",
};

describe("createHouseholdSchema", () => {
  it("trims names and keeps the date as YYYY-MM-DD", () => {
    expect(createHouseholdSchema.parse(VALID_HOUSEHOLD)).toMatchObject({ displayName: "Ana", babyBirthDate: "2026-08-27" });
  });

  it.each([
    ["displayName", ""],
    ["babyName", "   "],
    ["babyBirthDate", "2026-02-31"],
    ["babyBirthDate", "2099-01-01"],
    ["babyBirthDate", "2019-01-01"],
    ["householdId", "not-a-uuid"],
  ])("rejects %s = %j", (field, value) => {
    const result = createHouseholdSchema.safeParse({ ...VALID_HOUSEHOLD, [field]: value });
    expect(result.success).toBe(false);
  });
});

describe("joinHouseholdSchema", () => {
  it("normalizes the code as typed on a phone", () => {
    expect(joinHouseholdSchema.parse({ displayName: "Pablo", code: "abcde fghjk" })).toEqual({
      displayName: "Pablo",
      code: "ABCDEFGHJK",
    });
  });

  it("rejects malformed codes with a field message", () => {
    const result = joinHouseholdSchema.safeParse({ displayName: "Pablo", code: "ABC" });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 4: `schemas.ts` (verde)**

```ts
import { z } from "zod";

import type { BabySex } from "@/generated/prisma/enums";
import { normalizeInviteCode } from "@/features/household/invite-code";

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_BABY_AGE_DAYS = 3 * 365;
const BABY_SEXES = ["FEMALE", "MALE"] as const satisfies readonly BabySex[];

const displayName = z
  .string()
  .trim()
  .min(1, { error: "Escribe cómo quieres que te llamemos." })
  .max(40, { error: "Usa 40 caracteres como máximo." });

/**
 * Timezone-agnostic plausibility (the schema also runs in the browser): not
 * after tomorrow in any zone and not older than three years.
 */
const birthDate = z.iso
  .date({ error: "Indica la fecha de nacimiento." })
  .refine((value) => Date.parse(value) <= Date.now() + DAY_MS, {
    error: "La fecha de nacimiento no puede ser futura.",
  })
  .refine((value) => Date.parse(value) >= Date.now() - MAX_BABY_AGE_DAYS * DAY_MS, {
    error: "Revisa la fecha: parece demasiado antigua.",
  });

export const createHouseholdSchema = z.object({
  householdId: z.uuid(),
  babyId: z.uuid(),
  displayName,
  babyName: z
    .string()
    .trim()
    .min(1, { error: "Escribe el nombre del bebé." })
    .max(40, { error: "Usa 40 caracteres como máximo." }),
  babyBirthDate: birthDate,
  babySex: z.enum(BABY_SEXES).optional(),
});

export type CreateHouseholdInput = z.infer<typeof createHouseholdSchema>;

export const joinHouseholdSchema = z.object({
  displayName,
  code: z.string().transform((raw, ctx) => {
    const code = normalizeInviteCode(raw);
    if (!code) {
      ctx.addIssue({ code: "custom", message: "El código tiene 10 letras y números, como ABCDE-FGHJK." });
      return z.NEVER;
    }
    return code;
  }),
});

export type JoinHouseholdInput = z.infer<typeof joinHouseholdSchema>;
```

- [ ] **Step 5: Verde** — `npm run test:unit`.

- [ ] **Step 6: Commit** — `feat(household): add household and join schemas`

---

### Task 4: `requireUserId()` para usuarios sin familia

**Files:**
- Modify: `src/features/auth/session.ts`, `src/features/auth/session.test.ts`

**Interfaces:**
- Produces: `requireUserId(): Promise<string>` — sesión válida o `redirect("/login")`; no exige familia (crear y unirse se hacen sin ella).

- [ ] **Step 1: Tests (rojo)** — en `session.test.ts`:

```ts
describe("requireUserId", () => {
  it("redirects to /login without a valid session", async () => {
    getClaims.mockResolvedValue({ data: null, error: new Error("expired") });
    await expect(requireUserId()).rejects.toThrow("REDIRECT:/login");
  });

  it("returns the user id without requiring a household", async () => {
    getClaims.mockResolvedValue(SIGNED_IN);
    await expect(requireUserId()).resolves.toBe("u1");
    expect(getMemberByUserId).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Implementación (verde)**

```ts
/** For flows that run before having a household: create one or join one. */
export async function requireUserId(): Promise<string> {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");
  return userId;
}
```

y `requireMember()` pasa a usarla (`const userId = await requireUserId();`).

- [ ] **Step 3: Commit** — `feat(auth): add requireUserId for pre-household flows`

---

### Task 5: Queries del módulo

**Files:**
- Create: `src/features/household/queries.ts`, `src/features/household/queries.int.test.ts`
- Modify: `src/test/factories.ts` (`createInvite`)

**Interfaces:**
- Produces:
  - `type HouseholdMemberSummary = { userId: string; displayName: string; role: HouseholdRole }`
  - `listHouseholdMembers(householdId: string): Promise<HouseholdMemberSummary[]>` (para "por Ana" y Ajustes)
  - `getPendingInvite(householdId: string, now?: Date): Promise<{ expiresAt: Date } | null>` (Ajustes: "invitación activa hasta las 14:30"; nunca devuelve el hash)
  - Factoría: `createInvite(householdId: string, input: { code: string; expiresAt?: Date; usedAt?: Date; createdById: string }): Promise<{ inviteId: string }>`

- [ ] **Step 1: Tests de integración (rojo)**

```ts
import { describe, expect, it } from "vitest";

import { getPendingInvite, listHouseholdMembers } from "@/features/household/queries";
import { createFamily, createInvite, createMember } from "@/test/factories";

describe("listHouseholdMembers", () => {
  it("lists only the household's members, oldest first", async () => {
    const family = await createFamily();
    await createMember(family.householdId, { role: "MEMBER", displayName: "Pablo" });
    await createFamily();

    const members = await listHouseholdMembers(family.householdId);
    expect(members.map((member) => member.displayName)).toEqual(["Ana", "Pablo"]);
  });
});

describe("getPendingInvite", () => {
  it("returns the expiry of the unused, unexpired invite only", async () => {
    const family = await createFamily();
    const now = new Date("2026-10-08T12:00:00Z");
    await createInvite(family.householdId, { code: "AAAAAAAAAA", createdById: family.userId, expiresAt: new Date("2026-10-08T11:00:00Z") });
    await createInvite(family.householdId, { code: "BBBBBBBBBB", createdById: family.userId, usedAt: now, expiresAt: new Date("2026-10-09T12:00:00Z") });
    expect(await getPendingInvite(family.householdId, now)).toBeNull();

    await createInvite(family.householdId, { code: "CCCCCCCCCC", createdById: family.userId, expiresAt: new Date("2026-10-09T12:00:00Z") });
    expect(await getPendingInvite(family.householdId, now)).toEqual({ expiresAt: new Date("2026-10-09T12:00:00Z") });
  });
});
```

- [ ] **Step 2: `queries.ts` (verde)**

```ts
import "server-only";

import type { HouseholdRole } from "@/generated/prisma/client";
import { db } from "@/lib/db";

export type HouseholdMemberSummary = { userId: string; displayName: string; role: HouseholdRole };

export async function listHouseholdMembers(householdId: string): Promise<HouseholdMemberSummary[]> {
  return db.householdMember.findMany({
    where: { householdId },
    orderBy: { createdAt: "asc" },
    select: { userId: true, displayName: true, role: true },
  });
}

export async function getPendingInvite(
  householdId: string,
  now: Date = new Date(),
): Promise<{ expiresAt: Date } | null> {
  return db.householdInvite.findFirst({
    where: { householdId, usedAt: null, expiresAt: { gt: now } },
    orderBy: { createdAt: "desc" },
    select: { expiresAt: true },
  });
}
```

Factoría `createInvite` en `src/test/factories.ts`: guarda `codeHash: hashInviteCode(code)` (importa de `@/features/household/service`), `expiresAt` por defecto `+24 h`.

- [ ] **Step 3: Verde** — `npm run test:int`.

- [ ] **Step 4: Commit** — `feat(household): add member and pending invite queries`

---

### Task 6: `createHousehold` (familia + OWNER + bebé)

**Files:**
- Create: `src/features/household/actions.ts`, `src/features/household/actions.int.test.ts`, `src/test/action-mocks.ts`

**Interfaces:**
- Consumes: `requireUserId()` (Task 4), `createHouseholdSchema` (Task 3), `parseDateOnly`, `env.APP_TIMEZONE`.
- Produces: `createHousehold(input: unknown): Promise<ActionResult>` — en éxito `redirect("/")`; solo devuelve errores.
- Produces (tests): `src/test/action-mocks.ts` con `mockSession` (`requireUserId`/`requireMember` controlables), `next/cache` y `next/navigation` simulados. Es el patrón que reutilizarán las tareas 5–6 de la Fase 2.

- [ ] **Step 1: Mocks reutilizables**

`src/test/action-mocks.ts`:

```ts
/**
 * Session double for Server Action tests: set `session.userId` per test.
 * vi.hoisted only works within one file, so mock factories import this
 * module dynamically instead.
 */
export const session: { userId: string } = { userId: "" };
```

y en cada `actions.int.test.ts` (los `vi.mock` deben vivir en el archivo de test):

```ts
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));
vi.mock("@/features/auth/session", async () => {
  const { session } = await import("@/test/action-mocks");
  const { getMemberByUserId } = await import("@/features/auth/queries");
  return {
    requireUserId: vi.fn(async () => session.userId),
    requireMember: vi.fn(async () => {
      const member = await getMemberByUserId(session.userId);
      if (!member) throw new Error("REDIRECT:/join");
      return member;
    }),
  };
});
```

(`requireMember` simulado usa la query real, así los tests ejercitan la pertenencia de verdad contra la base de datos.)

- [ ] **Step 2: Tests de integración (rojo)**

```ts
describe("createHousehold", () => {
  it("creates the household, its OWNER and the baby, then goes home", async () => {
    session.userId = randomUUID();
    await expect(createHousehold(validInput())).rejects.toThrow("REDIRECT:/");

    const member = await db.householdMember.findUniqueOrThrow({ where: { userId: session.userId }, include: { household: { include: { babies: true } } } });
    expect(member).toMatchObject({ role: "OWNER", displayName: "Ana" });
    expect(member.household.babies).toHaveLength(1);
    expect(member.household.babies[0]?.birthDate).toEqual(parseDateOnly(BIRTH_DATE, "Europe/Madrid"));
  });

  it("is idempotent on a double tap with the same ids", async () => {
    session.userId = randomUUID();
    const input = validInput();
    await expect(createHousehold(input)).rejects.toThrow("REDIRECT:/");
    await expect(createHousehold(input)).rejects.toThrow("REDIRECT:/");
    expect(await db.household.count()).toBe(1);
  });

  it("returns field errors and writes nothing on invalid input", async () => {
    session.userId = randomUUID();
    const result = await createHousehold({ ...validInput(), babyName: " " });
    expect(result).toMatchObject({ ok: false, error: { code: "VALIDATION", fieldErrors: { babyName: expect.any(Array) } } });
    expect(await db.household.count()).toBe(0);
  });

  it("does not create a second household for a user who already has one", async () => {
    const family = await createFamily();
    session.userId = family.userId;
    await expect(createHousehold(validInput())).rejects.toThrow("REDIRECT:/");
    expect(await db.household.count()).toBe(1);
  });
});
```

(`validInput()` genera UUID nuevos de `householdId` y `babyId` en cada llamada, con `displayName: "Ana"`, `babyName: "Lucía"` y `babyBirthDate: BIRTH_DATE`, una fecha de hace 30 días en formato `YYYY-MM-DD` calculada al cargar el test, para que no caduque con el calendario.)

- [ ] **Step 3: `createHousehold` (verde)**

```ts
"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { requireMember, requireUserId } from "@/features/auth/session";
import { getMemberByUserId } from "@/features/auth/queries";
import { createHouseholdSchema } from "@/features/household/schemas";
import { actionError, type ActionResult, handleActionError, validationError } from "@/lib/action-result";
import { parseDateOnly } from "@/lib/dates";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

export async function createHousehold(input: unknown): Promise<ActionResult> {
  const userId = await requireUserId();
  const parsed = createHouseholdSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  const { householdId, babyId, displayName, babyName, babyBirthDate, babySex } = parsed.data;
  const birthDate = parseDateOnly(babyBirthDate, env.APP_TIMEZONE);
  if (!birthDate) {
    // Unreachable while the schema validates YYYY-MM-DD; kept so no invalid date is ever stored.
    const message = "Indica la fecha de nacimiento.";
    return actionError("VALIDATION", message, { babyBirthDate: [message] });
  }

  try {
    // Idempotent: a double tap, or a user who already has a household, lands home.
    if (!(await getMemberByUserId(userId))) {
      await db.household.create({
        data: {
          id: householdId,
          name: `Familia de ${displayName}`,
          members: { create: { userId, role: "OWNER", displayName } },
          babies: {
            create: {
              id: babyId,
              name: babyName,
              birthDate,
              sex: babySex,
            },
          },
        },
        select: { id: true },
      });
    }
  } catch (error) {
    // Two concurrent taps: the loser hits the unique userId; the winner's household stands.
    if (!(await getMemberByUserId(userId))) return handleActionError("createHousehold", error);
  }

  revalidatePath("/");
  redirect("/");
}
```

(La comprobación de `birthDate` evita una aserción `!` y garantiza que nunca se guarda una fecha inválida aunque el schema cambie.)

- [ ] **Step 4: Verde** — `npm run test:int`.

- [ ] **Step 5: Commit** — `feat(household): create household with owner and baby`

---

### Task 7: `createHouseholdInvite` y `joinHousehold`

**Files:**
- Modify: `src/features/household/actions.ts`, `src/features/household/actions.int.test.ts`

**Interfaces:**
- Produces:
  - `createHouseholdInvite(): Promise<ActionResult<{ code: string; expiresAt: string }>>` — `code` formateado (`ABCDE-FGHJK`), mostrado una vez; `expiresAt` en ISO.
  - `joinHousehold(input: unknown): Promise<ActionResult>` — en éxito `redirect("/")`.

- [ ] **Step 1: Tests de integración (rojo)**

```ts
describe("createHouseholdInvite", () => {
  it("returns the code once and stores only its hash", async () => {
    const family = await createFamily();
    session.userId = family.userId;
    const result = await createHouseholdInvite();
    if (!result.ok) throw new Error(result.error.message);

    expect(result.data.code).toMatch(/^[0-9A-HJKMNP-TV-Z]{5}-[0-9A-HJKMNP-TV-Z]{5}$/);
    const rows = await db.householdInvite.findMany({ where: { householdId: family.householdId } });
    expect(rows).toHaveLength(1);
    expect(JSON.stringify(rows)).not.toContain(result.data.code.replace("-", ""));
  });

  it("replaces the previous pending invite", async () => {
    const family = await createFamily();
    session.userId = family.userId;
    const first = await createHouseholdInvite();
    await createHouseholdInvite();
    if (!first.ok) throw new Error(first.error.message);

    session.userId = randomUUID();
    const result = await joinHousehold({ displayName: "Pablo", code: first.data.code });
    expect(result).toMatchObject({ ok: false, error: { code: "VALIDATION" } });
  });

  it("refuses when the household already has two members", async () => {
    const family = await createFamily();
    await createMember(family.householdId, { role: "MEMBER", displayName: "Pablo" });
    session.userId = family.userId;
    expect(await createHouseholdInvite()).toMatchObject({ ok: false, error: { code: "CONFLICT" } });
  });
});

describe("joinHousehold", () => {
  it("adds the user as MEMBER, spends the code and goes home", async () => {
    const { family, code } = await familyWithInvite();
    const partnerId = randomUUID();
    session.userId = partnerId;

    await expect(joinHousehold({ displayName: "Pablo", code: code.toLowerCase().replace("-", " ") })).rejects.toThrow("REDIRECT:/");
    expect(await db.householdMember.findUnique({ where: { userId: partnerId } })).toMatchObject({ householdId: family.householdId, role: "MEMBER" });
    expect(await db.householdInvite.findFirst({ where: { householdId: family.householdId } })).toMatchObject({ usedById: partnerId });
  });

  it("answers unknown, used and expired codes identically", async () => {
    const { family, code } = await familyWithInvite();
    session.userId = randomUUID();
    await expect(joinHousehold({ displayName: "Pablo", code })).rejects.toThrow("REDIRECT:/");

    await createInvite(family.householdId, { code: "EXP1RED000", createdById: family.userId, expiresAt: new Date(Date.now() - 1000) });
    session.userId = randomUUID();
    const results = await Promise.all([
      joinHousehold({ displayName: "Eva", code }), // used
      joinHousehold({ displayName: "Eva", code: "EXP1RED000" }), // expired
      joinHousehold({ displayName: "Eva", code: "ZZZZZ-ZZZZZ" }), // unknown
    ]);
    expect(new Set(results.map((result) => JSON.stringify(result))).size).toBe(1);
    expect(results[0]).toMatchObject({ ok: false, error: { code: "VALIDATION", fieldErrors: { code: expect.any(Array) } } });
  });

  it("lets exactly one of two simultaneous redemptions win", async () => {
    const { family, code } = await familyWithInvite();
    const [first, second] = [randomUUID(), randomUUID()];

    const attempt = async (userId: string): Promise<string> => {
      session.userId = userId; // read synchronously by the mocked requireUserId
      return joinHousehold({ displayName: "Pablo", code }).then(
        (result) => (result.ok ? "ok" : result.error.code),
        (error: unknown) => (error instanceof Error ? error.message : "error"),
      );
    };
    const outcomes = await Promise.all([attempt(first), attempt(second)]);

    expect(outcomes.sort()).toEqual(["REDIRECT:/", "VALIDATION"]);
    expect(await db.householdMember.count({ where: { householdId: family.householdId } })).toBe(2);
  });

  it("keeps an existing household and rejects joining another", async () => {
    const { code } = await familyWithInvite();
    const other = await createFamily();
    session.userId = other.userId;
    expect(await joinHousehold({ displayName: "Ana", code })).toMatchObject({ ok: false, error: { code: "CONFLICT" } });
    expect(await db.householdMember.findUnique({ where: { userId: other.userId } })).toMatchObject({ householdId: other.householdId });
  });
});
```

(`familyWithInvite()` = `createFamily()` + `createHouseholdInvite()` como su OWNER. En el test concurrente, `requireUserId` simulado captura `session.userId` en su primera línea síncrona, antes del primer `await`; si al implementar resultara frágil, el doble se cambia por una cola de ids.)

- [ ] **Step 2: Implementación (verde)** — en `actions.ts`:

```ts
const INVALID_CODE_MESSAGE = "Ese código no vale o ha caducado. Pide uno nuevo.";
const FULL_HOUSEHOLD_MESSAGE = "Esta familia ya está completa.";

/** Thrown inside the join transaction so the claimed invite rolls back too. */
class HouseholdFullError extends Error {}

/** Serializes invite creation and redemption per household. */
async function lockHousehold(tx: TransactionClient, householdId: string): Promise<void> {
  await tx.$queryRaw`SELECT id FROM public.households WHERE id = ${householdId}::uuid FOR UPDATE`;
}

export async function createHouseholdInvite(): Promise<ActionResult<{ code: string; expiresAt: string }>> {
  const member = await requireMember();
  try {
    const invite = await db.$transaction(async (tx) => {
      await lockHousehold(tx, member.householdId);
      const members = await tx.householdMember.count({ where: { householdId: member.householdId } });
      if (members >= MAX_HOUSEHOLD_MEMBERS) return null;

      // At most one usable code per household: a new one revokes the rest.
      await tx.householdInvite.deleteMany({ where: { householdId: member.householdId, usedAt: null } });
      const code = generateInviteCode();
      const expiresAt = getInviteExpiry(new Date());
      await tx.householdInvite.create({
        data: { householdId: member.householdId, codeHash: hashInviteCode(code), expiresAt, createdById: member.userId },
        select: { id: true },
      });
      return { code: formatInviteCode(code), expiresAt: expiresAt.toISOString() };
    });
    if (!invite) return actionError("CONFLICT", FULL_HOUSEHOLD_MESSAGE);
    revalidatePath("/settings");
    return ok(invite);
  } catch (error) {
    return handleActionError("createHouseholdInvite", error);
  }
}

export async function joinHousehold(input: unknown): Promise<ActionResult> {
  const userId = await requireUserId();
  const parsed = joinHouseholdSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const joined = await db.$transaction(async (tx) => {
      const now = new Date();
      const invite = await tx.householdInvite.findFirst({
        where: { codeHash: hashInviteCode(parsed.data.code), usedAt: null, expiresAt: { gt: now } },
        select: { id: true, householdId: true },
      });
      if (!invite) return false;

      await lockHousehold(tx, invite.householdId);
      // Re-checked under the lock: a concurrent redemption may have won.
      const claim = await tx.householdInvite.updateMany({
        where: { id: invite.id, usedAt: null },
        data: { usedAt: now, usedById: userId },
      });
      if (claim.count === 0) return false;

      const members = await tx.householdMember.count({ where: { householdId: invite.householdId } });
      if (members >= MAX_HOUSEHOLD_MEMBERS) throw new HouseholdFullError();

      await tx.householdMember.create({
        data: { householdId: invite.householdId, userId, role: "MEMBER", displayName: parsed.data.displayName },
        select: { id: true },
      });
      return true;
    });
    if (!joined) {
      return actionError("VALIDATION", INVALID_CODE_MESSAGE, { code: [INVALID_CODE_MESSAGE] });
    }
  } catch (error) {
    if (error instanceof HouseholdFullError) return actionError("CONFLICT", FULL_HOUSEHOLD_MESSAGE);
    // userId is unique: the user already belongs to a household (rolled back).
    if (readPrismaCode(error) === "P2002") return actionError("CONFLICT", "Ya perteneces a una familia.");
    return handleActionError("joinHousehold", error);
  }

  revalidatePath("/");
  redirect("/");
}
```

(`TransactionClient` es `Prisma.TransactionClient` del cliente generado; `readPrismaErrorCode` pasa a exportarse desde `lib/action-result.ts` con el nombre `readPrismaCode`.)

- [ ] **Step 3: Verde** — `npm run test:int` (incluye el test concurrente; se repite 5 veces para descartar falsos verdes: `npx vitest run --project integration -t "simultaneous" --repeat 5` o un bucle).

- [ ] **Step 4: Commit** — `feat(household): add single-use invites and atomic join`

---

### Task 8: Cierre

- [ ] Skill `engineering:code-review` sobre `features/household` y la migración; corregir lo que encuentre.
- [ ] `npm run typecheck`, `npm run lint`, `npm test`, `npm run format:check`, `npm run build`.
- [ ] *Advisors* de seguridad y rendimiento (cambio de esquema → regla 0.2).
- [ ] `README.md`: marcar "Familia: crear familia y bebé, generar código de invitación (con caducidad) y unirse con código"; añadir a la Fase 3 "Ajustes: expulsar a un miembro" como propuesta.
- [ ] `CLAUDE.md` §7: ADR-043 resumido como decisión 043; `requireUserId()` (044).
- [ ] Commit — `docs: record household and invite decisions`; push si se autoriza.

## Fuera de alcance (Fase 3)

- Pantallas: `/join` como entrada (dos botones grandes: "Crear familia" / "Tengo un código"), `/join/create`, `/join/code`, y en Ajustes "Invitar" con **Compartir** (Web Share API) y **Generar otro**.
- Expulsar a un miembro y transferir el rol `OWNER`.

## Decisiones (aprobadas el 2026-10-08)

- **D1 · Almacenamiento:** SHA-256 en `code_hash`.
- **D2 · Caducidad:** 24 h.
- **D3 · Miembros por familia:** máximo 2.
