# Fase 2 · Tarea 1 — Autorización por familia y base de datos de test · Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** que cualquier query o Server Action pueda comprobar en una línea que un `babyId` pertenece a la familia del usuario (y responder `NOT_FOUND` sin revelar que existe), con tests de integración contra un PostgreSQL real que el resto de la Fase 2 reutilizará para idempotencia y concurrencia.

**Architecture:** una base de datos `baby_tracker_test` dentro del proyecto Supabase **dev** (no hay Docker en la máquina; el rol `prisma` tiene `createdb` y ambos poolers enrutan por nombre de base de datos, verificado el 2026-10-08). Vitest pasa a dos proyectos: `unit` (rápido, sin red) e `integration` (`*.int.test.ts`, en serie, `TRUNCATE` entre tests con guarda de nombre de base de datos). La autorización vive en `features/auth` porque todos los módulos pueden importar de ahí (CLAUDE.md §2.9).

**Tech Stack:** Prisma 7.10 + `@prisma/adapter-pg`, `pg` 8 (ya instalado), Vitest 5 (`test.projects`), Zod 4. **Sin dependencias nuevas.**

**Spec:** [`CLAUDE.md`](../../../CLAUDE.md) §2.2, §2.3, §2.7, §3.3, §3.5 y [`README.md` → Fase 2](../../../README.md).

## Contexto: objetivos de la Fase 2 y orden propuesto

| # | Tarea del roadmap | Depende de |
|---|---|---|
| **1** | **Autorización (`requireMember()` + el `babyId` pertenece a la familia) + infraestructura de tests de integración** | — |
| 2 | Familia: crear familia y bebé, código de invitación con caducidad, unirse con código | 1 |
| 3 | Esquemas Zod por módulo (alta/edición, reglas cruzadas, mensajes en español) | — |
| 4 | Queries por módulo (por día, detalle, último registro, sesión activa) | 1, 3 |
| 5 | Server Actions CRUD idempotentes (UUID del cliente, `createdById`/`updatedById`, revalidación) | 1, 3 |
| 6 | Cronómetros seguros ante concurrencia (start/stop de toma y siesta) | 1, 5 |
| 7 | `getDailySummary` en la zona del hogar, con sesiones que cruzan la medianoche | 4 |

Se empieza por la 1 porque todas las demás la usan, y porque los tests de autorización, idempotencia y concurrencia que exige la Fase 2 necesitan un PostgreSQL real: la infraestructura se construye en la tarea que la necesita primero.

## Global Constraints

- Ninguna dependencia nueva (`pg`, `tsx`, Vitest y Zod ya están instalados).
- La base de datos de test vive **solo** en el proyecto **dev** y se llama exactamente `baby_tracker_test`; ningún script ni test escribe en `postgres` (datos de dev) ni en otro proyecto.
- `TRUNCATE` solo dentro de `baby_tracker_test`, tras comprobar `current_database()` (regla 0.2: requiere confirmación explícita, ver D2).
- Recursos de otra familia → `NOT_FOUND` con el **mismo** mensaje que un id inexistente (CLAUDE.md §2.7).
- `redirect()` fuera de `try/catch`; tipos de retorno explícitos; sin `any`, `!` ni `as` injustificado.
- Commits atómicos en inglés al cerrar cada tarea (Conventional Commits + `Co-Authored-By`).
- Nada de identificadores de infraestructura en archivos versionados: se derivan de `.env`.

## Review Focus

1. **Enumeración de recursos:** un `babyId` de otra familia, uno inexistente y uno mal formado deben ser indistinguibles para el cliente (mismo código y mensaje) → test en Task 5.
2. **Tests que tocan datos reales:** si `.env` apunta a otro proyecto o la URL no es la de `baby_tracker_test`, el script y el *setup* deben negarse antes de escribir → test de guarda en Task 2 y Task 3.
3. **Sesión caducada en una Server Action:** sin sesión debe redirigir a `/login`, no lanzar un 500 → test en Task 6.
4. **Aislamiento entre tests:** un test no puede ver datos del anterior (truncado en `beforeEach`, ejecución en serie) → test en Task 3.
5. **Bebé inexistente en la familia:** una familia sin bebé no puede romper las páginas (redirección controlada) → test en Task 6.

---

### Task 1: Stubs de plataforma compartidos

**Files:**
- Create: `prisma/platform/shadow-stubs.sql`
- Modify: `prisma.config.ts`

**Interfaces:**
- Produces: `prisma/platform/shadow-stubs.sql`, ejecutable en cualquier base de datos vacía (shadow DB y `baby_tracker_test`).

- [ ] **Step 1: Extraer los stubs a un archivo**

`prisma/platform/shadow-stubs.sql`:

```sql
-- No-op stand-ins for the objects created by supabase-bootstrap.sql, for
-- plain PostgreSQL databases where migrations must replay: Prisma's shadow
-- database and the integration test database (baby_tracker_test).
CREATE SCHEMA IF NOT EXISTS private;
CREATE OR REPLACE FUNCTION private.auth_uid() RETURNS uuid
  LANGUAGE sql STABLE AS 'SELECT NULL::uuid';
CREATE OR REPLACE FUNCTION private.add_table_to_realtime(target regclass) RETURNS void
  LANGUAGE plpgsql AS 'BEGIN END';
```

- [ ] **Step 2: `prisma.config.ts` lee el archivo**

```ts
import { existsSync, readFileSync } from "node:fs";
// …
    initShadowDb: readFileSync("prisma/platform/shadow-stubs.sql", "utf8"),
```

(Se elimina el literal SQL y su comentario pasa al archivo.)

- [ ] **Step 3: Verificar que no cambia nada**

```bash
npx prisma migrate status
npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script
```

Expected: `Database schema is up to date!` y `-- This is an empty migration.`

- [ ] **Step 4: Commit** — `refactor(prisma): share platform stubs between shadow and test databases`

---

### Task 2: Script de la base de datos de test

**Files:**
- Create: `scripts/test-db.ts`, `scripts/database-url.ts`, `scripts/database-url.test.ts`
- Modify: `package.json` (script `test:db`), `.env.example` (sin variables nuevas: se documenta que usa `SEED_DEV_PROJECT_REF`)

**Interfaces:**
- Produces: `withDatabase(url: string, database: string): string` y `assertDevProject(url: string, devProjectRef: string): void` en `scripts/database-url.ts`; comando `npm run test:db`.

- [ ] **Step 1: Tests de las utilidades de URL (rojo)**

`scripts/database-url.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { assertDevProject, withDatabase } from "./database-url";

const URL_6543 =
  "postgresql://prisma.abcdefghijklmnopqrst:secret@aws-1-eu-west-3.pooler.supabase.com:6543/postgres?pgbouncer=true";

describe("withDatabase", () => {
  it("swaps only the database name, keeping credentials, port and params", () => {
    expect(withDatabase(URL_6543, "baby_tracker_test")).toBe(
      "postgresql://prisma.abcdefghijklmnopqrst:secret@aws-1-eu-west-3.pooler.supabase.com:6543/baby_tracker_test?pgbouncer=true",
    );
  });
});

describe("assertDevProject", () => {
  it("accepts URLs of the dev project", () => {
    expect(() => assertDevProject(URL_6543, "abcdefghijklmnopqrst")).not.toThrow();
  });

  it("refuses any other project", () => {
    expect(() => assertDevProject(URL_6543, "zzzzzzzzzzzzzzzzzzzz")).toThrow(
      /not the dev Supabase project/,
    );
  });
});
```

`vitest.config.ts` incluye `scripts/**/*.test.ts` en el proyecto `unit` (Task 3).

- [ ] **Step 2: `scripts/database-url.ts` (verde)**

```ts
export const TEST_DATABASE = "baby_tracker_test";

/** Same connection, different database: credentials, host, port and params kept. */
export function withDatabase(url: string, database: string): string {
  const parsed = new URL(url);
  parsed.pathname = `/${database}`;
  return parsed.toString();
}

/** Supavisor users are `<role>.<project-ref>`; refuse anything but dev. */
export function assertDevProject(url: string, devProjectRef: string): void {
  if (!new URL(url).username.endsWith(`.${devProjectRef}`)) {
    throw new Error("Refusing to continue: this is not the dev Supabase project.");
  }
}
```

- [ ] **Step 3: `scripts/test-db.ts`**

```ts
/**
 * Creates (if missing) and migrates baby_tracker_test inside the DEV project:
 *   npm run test:db
 * Safe to re-run: CREATE DATABASE only when absent, migrations are idempotent.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

import { Client } from "pg";

import { assertDevProject, TEST_DATABASE, withDatabase } from "./database-url";

process.loadEnvFile(".env");
const directUrl = requireEnv("DIRECT_URL");
const devProjectRef = requireEnv("SEED_DEV_PROJECT_REF");
const ssl = process.env.DATABASE_CA_CERT
  ? { ca: process.env.DATABASE_CA_CERT, rejectUnauthorized: true }
  : { rejectUnauthorized: false };

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name} in .env`);
  return value;
}

async function withClient(url: string, run: (client: Client) => Promise<void>): Promise<void> {
  const client = new Client({ connectionString: url, ssl });
  await client.connect();
  try {
    await run(client);
  } finally {
    await client.end();
  }
}

async function main(): Promise<void> {
  assertDevProject(directUrl, devProjectRef);
  const testUrl = withDatabase(directUrl, TEST_DATABASE);

  await withClient(directUrl, async (client) => {
    const { rowCount } = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [TEST_DATABASE]);
    // The name is a constant, never user input, so interpolation is safe.
    if (rowCount === 0) await client.query(`CREATE DATABASE ${TEST_DATABASE}`);
  });
  await withClient(testUrl, async (client) => {
    await client.query(readFileSync("prisma/platform/shadow-stubs.sql", "utf8"));
  });

  // prisma.config.ts loads .env without overriding, so this DIRECT_URL wins.
  execFileSync("npx", ["prisma", "migrate", "deploy"], {
    env: { ...process.env, DIRECT_URL: testUrl },
    stdio: "inherit",
    shell: process.platform === "win32",
  });
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
```

`package.json` → `"test:db": "tsx scripts/test-db.ts"`.

- [ ] **Step 4: Ejecutar y verificar vía MCP (regla 0.2)**

```bash
npm run test:db
```

Expected: `All migrations have been successfully applied.` Luego, con el MCP (proyecto dev): `select datname from pg_database where datname = 'baby_tracker_test'` → 1 fila; la base `postgres` sigue con sus datos del seed (recuentos sin cambios).

- [ ] **Step 5: Commit** — `test(db): add integration test database setup`

---

### Task 3: Vitest con proyectos `unit` e `integration`

**Files:**
- Modify: `vitest.config.ts`, `package.json` (`test`, `test:unit`, `test:int`)
- Create: `src/test/server-only.ts`, `src/test/integration-env.ts`, `src/test/integration-setup.ts`, `src/test/factories.ts`, `src/test/isolation.int.test.ts`

**Interfaces:**
- Produces:
  - `createHousehold(input?: { name?: string }): Promise<{ householdId: string }>`
  - `createMember(householdId: string, input?: { role?: HouseholdRole; displayName?: string }): Promise<{ userId: string; memberId: string }>`
  - `createBaby(householdId: string, input?: { name?: string; createdAt?: Date }): Promise<{ babyId: string }>`
  - `createFamily(): Promise<{ householdId: string; userId: string; babyId: string }>` (las tres anteriores)

- [ ] **Step 1: `vitest.config.ts`**

```ts
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

import { integrationEnv } from "./src/test/integration-env";

const src = fileURLToPath(new URL("./src", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": src,
      // `server-only` throws outside the react-server condition; tests import
      // server modules directly.
      "server-only": fileURLToPath(new URL("./src/test/server-only.ts", import.meta.url)),
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: ["src/**/*.test.ts", "scripts/**/*.test.ts"],
          exclude: ["src/**/*.int.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          environment: "node",
          include: ["src/**/*.int.test.ts"],
          setupFiles: ["src/test/integration-setup.ts"],
          // One shared database: files must not truncate under each other.
          fileParallelism: false,
          env: integrationEnv(),
        },
      },
    ],
  },
});
```

`src/test/server-only.ts`: `export {};`

- [ ] **Step 2: `src/test/integration-env.ts`**

```ts
import { existsSync } from "node:fs";

import { TEST_DATABASE, withDatabase } from "../../scripts/database-url";

/**
 * Env for the integration project: the app's own DATABASE_URL (transaction
 * pooler, 6543) pointed at baby_tracker_test, so src/lib/db.ts runs unchanged.
 */
export function integrationEnv(): Record<string, string> {
  if (existsSync(".env")) process.loadEnvFile(".env");
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return {};
  return { DATABASE_URL: withDatabase(databaseUrl, TEST_DATABASE), NODE_ENV: "test" };
}
```

(Ruta relativa `../../scripts` porque `vitest.config.ts` se evalúa antes de que exista el alias `@/`; es la única excepción a la regla de imports y va comentada.)

- [ ] **Step 3: `src/test/integration-setup.ts`**

```ts
import { afterAll, beforeEach } from "vitest";

import { db } from "@/lib/db";

beforeEach(async () => {
  const [row] = await db.$queryRaw<{ name: string }[]>`SELECT current_database() AS name`;
  // Last line of defense: never wipe anything but the test database.
  if (row?.name !== "baby_tracker_test") {
    throw new Error(`Refusing to truncate database "${row?.name}"`);
  }
  // Cascades to members, invites, babies and every baby record.
  await db.$executeRaw`TRUNCATE public.households CASCADE`;
});

afterAll(async () => {
  await db.$disconnect();
});
```

- [ ] **Step 4: `src/test/factories.ts`**

```ts
import { randomUUID } from "node:crypto";

import type { HouseholdRole } from "@/generated/prisma/client";
import { db } from "@/lib/db";

export async function createHousehold(input: { name?: string } = {}): Promise<{ householdId: string }> {
  const { id } = await db.household.create({
    data: { name: input.name ?? "Test household" },
    select: { id: true },
  });
  return { householdId: id };
}

export async function createMember(
  householdId: string,
  input: { role?: HouseholdRole; displayName?: string } = {},
): Promise<{ userId: string; memberId: string }> {
  const userId = randomUUID();
  const { id } = await db.householdMember.create({
    data: { householdId, userId, role: input.role ?? "OWNER", displayName: input.displayName ?? "Ana" },
    select: { id: true },
  });
  return { userId, memberId: id };
}

export async function createBaby(
  householdId: string,
  input: { name?: string; createdAt?: Date } = {},
): Promise<{ babyId: string }> {
  const { id } = await db.baby.create({
    data: {
      householdId,
      name: input.name ?? "Lucía",
      birthDate: new Date("2026-08-27T08:00:00Z"),
      createdAt: input.createdAt,
    },
    select: { id: true },
  });
  return { babyId: id };
}

export async function createFamily(): Promise<{ householdId: string; userId: string; babyId: string }> {
  const { householdId } = await createHousehold();
  const { userId } = await createMember(householdId);
  const { babyId } = await createBaby(householdId);
  return { householdId, userId, babyId };
}
```

- [ ] **Step 5: Test de aislamiento (Review Focus 4)**

`src/test/isolation.int.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { createFamily } from "@/test/factories";

describe("integration test isolation", () => {
  it("runs against baby_tracker_test", async () => {
    const [row] = await db.$queryRaw<{ name: string }[]>`SELECT current_database() AS name`;
    expect(row?.name).toBe("baby_tracker_test");
  });

  it.each([1, 2])("starts every test with an empty database (run %i)", async () => {
    expect(await db.household.count()).toBe(0);
    await createFamily();
    expect(await db.household.count()).toBe(1);
  });
});
```

- [ ] **Step 6: Scripts y ejecución**

`package.json`: `"test": "vitest run"` (ambos proyectos), `"test:unit": "vitest run --project unit"`, `"test:int": "vitest run --project integration"`.

Run: `npm run test:unit` → los 70 actuales + 3 de URL en verde. `npm run test:int` → 3 en verde.

- [ ] **Step 7: Commit** — `test: split unit and integration suites with a real Postgres`

---

### Task 4: `NotFoundError` en el contrato de errores

**Files:**
- Modify: `src/lib/action-result.ts`, `src/lib/action-result.test.ts`

**Interfaces:**
- Produces: `class NotFoundError extends Error`; `handleActionError` lo traduce a `NOT_FOUND` con el mensaje de siempre.

- [ ] **Step 1: Test (rojo)** — en `action-result.test.ts`:

```ts
it("maps NotFoundError to the same NOT_FOUND message as Prisma P2025", () => {
  const fromAuthz = handleActionError("test", new NotFoundError());
  const fromPrisma = handleActionError("test", prismaError("P2025", "x"));
  expect(fromAuthz).toEqual(fromPrisma);
  expect(fromAuthz).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
});
```

- [ ] **Step 2: Implementación (verde)**

```ts
/** Thrown by authorization checks: "not yours" and "does not exist" look identical. */
export class NotFoundError extends Error {
  override name = "NotFoundError";
}
```

y en `handleActionError`, antes de leer el código de Prisma: `if (error instanceof NotFoundError || code === "P2025") return actionError("NOT_FOUND", "No hemos encontrado ese registro.");`

- [ ] **Step 3: Commit** — `feat(errors): add NotFoundError for authorization checks`

---

### Task 5: `assertBabyInHousehold` y `getPrimaryBaby`

**Files:**
- Create: `src/features/auth/authorization.ts`, `src/features/auth/authorization.int.test.ts`
- Modify: `src/features/auth/queries.ts`

**Interfaces:**
- Consumes: `NotFoundError` (Task 4), factorías (Task 3).
- Produces:
  - `assertBabyInHousehold(babyId: string, householdId: string): Promise<void>` — lanza `NotFoundError`.
  - `type CurrentBaby = { id: string; name: string; birthDate: Date }`
  - `getPrimaryBaby(householdId: string): Promise<CurrentBaby | null>` — el bebé más antiguo de la familia (el MVP muestra uno; el selector de varios está en el backlog).

- [ ] **Step 1: Tests de integración (rojo)**

`src/features/auth/authorization.int.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { assertBabyInHousehold } from "@/features/auth/authorization";
import { getPrimaryBaby } from "@/features/auth/queries";
import { handleActionError, NotFoundError } from "@/lib/action-result";
import { createBaby, createFamily, createHousehold } from "@/test/factories";

describe("assertBabyInHousehold", () => {
  it("accepts a baby of the member's household", async () => {
    const family = await createFamily();
    await expect(assertBabyInHousehold(family.babyId, family.householdId)).resolves.toBeUndefined();
  });

  it("rejects a baby of another household", async () => {
    const mine = await createFamily();
    const theirs = await createFamily();
    await expect(assertBabyInHousehold(theirs.babyId, mine.householdId)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("answers a foreign, a missing and a malformed id identically", async () => {
    const mine = await createFamily();
    const theirs = await createFamily();
    const results = await Promise.all(
      [theirs.babyId, "5eed0000-0000-4000-8000-00000000dead", "not-a-uuid"].map((babyId) =>
        assertBabyInHousehold(babyId, mine.householdId).then(
          () => "resolved",
          (error: unknown) => handleActionError("test", error),
        ),
      ),
    );
    expect(new Set(results.map((result) => JSON.stringify(result))).size).toBe(1);
    expect(results[0]).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });
});

describe("getPrimaryBaby", () => {
  it("returns the household's first baby, never another household's", async () => {
    const { householdId } = await createHousehold();
    const { babyId } = await createBaby(householdId, { name: "Lucía", createdAt: new Date("2026-09-01T00:00:00Z") });
    await createBaby(householdId, { name: "Pablo", createdAt: new Date("2026-09-02T00:00:00Z") });
    await createFamily();

    expect(await getPrimaryBaby(householdId)).toMatchObject({ id: babyId, name: "Lucía" });
  });

  it("returns null for a household without babies", async () => {
    const { householdId } = await createHousehold();
    expect(await getPrimaryBaby(householdId)).toBeNull();
  });
});
```

Run: `npm run test:int` → FAIL (`assertBabyInHousehold` no existe).

- [ ] **Step 2: `src/features/auth/authorization.ts` (verde)**

```ts
import "server-only";

import { z } from "zod";

import { db } from "@/lib/db";
import { NotFoundError } from "@/lib/action-result";

const babyIdSchema = z.uuid();

/**
 * Prisma bypasses RLS, so every query and action checks ownership in code
 * (CLAUDE.md §2.7). Foreign, missing and malformed ids all throw the same
 * NotFoundError, so a response never reveals that a record exists.
 */
export async function assertBabyInHousehold(babyId: string, householdId: string): Promise<void> {
  // A malformed id would otherwise surface as a database error.
  if (!babyIdSchema.safeParse(babyId).success) throw new NotFoundError();
  const baby = await db.baby.findFirst({ where: { id: babyId, householdId }, select: { id: true } });
  if (!baby) throw new NotFoundError();
}
```

- [ ] **Step 3: `getPrimaryBaby` en `src/features/auth/queries.ts`**

```ts
export type CurrentBaby = { id: string; name: string; birthDate: Date };

/** The MVP shows one baby per household: the first one created. */
export async function getPrimaryBaby(householdId: string): Promise<CurrentBaby | null> {
  return db.baby.findFirst({
    where: { householdId },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, birthDate: true },
  });
}
```

- [ ] **Step 4: Verde** — `npm run test:int`: 5 tests nuevos en verde.

- [ ] **Step 5: Commit** — `feat(auth): authorize baby access by household`

---

### Task 6: `requireBaby()` y tests de sesión

**Files:**
- Modify: `src/features/auth/session.ts`
- Create: `src/features/auth/session.test.ts`

**Interfaces:**
- Consumes: `requireMember()`, `getPrimaryBaby()` (Task 5).
- Produces: `requireBaby(): Promise<{ member: Member; baby: CurrentBaby }>` — punto de entrada de las páginas de módulos; redirige a `/join` si la familia no tiene bebé (la Tarea 2 sustituirá ese destino por el alta del bebé).

- [ ] **Step 1: Tests unitarios con mocks (rojo)**

`src/features/auth/session.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

import { requireBaby, requireMember } from "@/features/auth/session";

// vi.mock factories are hoisted above imports; vi.hoisted shares the mocks.
const { getClaims, getMemberByUserId, getPrimaryBaby } = vi.hoisted(() => ({
  getClaims: vi.fn(),
  getMemberByUserId: vi.fn(),
  getPrimaryBaby: vi.fn(),
}));

vi.mock("next/server", () => ({ connection: vi.fn(async () => undefined) }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseReadOnlyServerClient: async () => ({ auth: { getClaims } }),
}));
vi.mock("@/features/auth/queries", () => ({ getMemberByUserId, getPrimaryBaby }));

const MEMBER = { memberId: "m1", userId: "u1", householdId: "h1", role: "OWNER", displayName: "Ana" };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("requireMember", () => {
  it("redirects to /login without a valid session (expired token in an action)", async () => {
    getClaims.mockResolvedValue({ data: null, error: new Error("expired") });
    await expect(requireMember()).rejects.toThrow("REDIRECT:/login");
  });

  it("redirects to /join when the user has no household", async () => {
    getClaims.mockResolvedValue({ data: { claims: { sub: "u1" } }, error: null });
    getMemberByUserId.mockResolvedValue(null);
    await expect(requireMember()).rejects.toThrow("REDIRECT:/join");
  });

  it("returns the member of the signed-in user", async () => {
    getClaims.mockResolvedValue({ data: { claims: { sub: "u1" } }, error: null });
    getMemberByUserId.mockResolvedValue(MEMBER);
    await expect(requireMember()).resolves.toEqual(MEMBER);
  });
});

describe("requireBaby", () => {
  it("redirects when the household has no baby yet", async () => {
    getClaims.mockResolvedValue({ data: { claims: { sub: "u1" } }, error: null });
    getMemberByUserId.mockResolvedValue(MEMBER);
    getPrimaryBaby.mockResolvedValue(null);
    await expect(requireBaby()).rejects.toThrow("REDIRECT:/join");
  });

  it("returns member and baby", async () => {
    const baby = { id: "b1", name: "Lucía", birthDate: new Date("2026-08-27T08:00:00Z") };
    getClaims.mockResolvedValue({ data: { claims: { sub: "u1" } }, error: null });
    getMemberByUserId.mockResolvedValue(MEMBER);
    getPrimaryBaby.mockResolvedValue(baby);
    await expect(requireBaby()).resolves.toEqual({ member: MEMBER, baby });
  });
});
```

(`React.cache` no memoriza fuera de un render de servidor, así que cada test ve sus propios mocks.)

- [ ] **Step 2: `requireBaby` en `session.ts` (verde)**

```ts
import { type CurrentBaby, getMemberByUserId, getPrimaryBaby, type Member } from "@/features/auth/queries";
// …
export type { CurrentBaby, Member } from "@/features/auth/queries";

/** Entry point of every module page: member plus the household's baby. */
export async function requireBaby(): Promise<{ member: Member; baby: CurrentBaby }> {
  const member = await requireMember();
  const baby = await getPrimaryBaby(member.householdId);
  // Until task 2 adds "create baby", a household without one goes back to /join.
  if (!baby) redirect("/join");
  return { member, baby };
}
```

- [ ] **Step 3: Verde** — `npm run test:unit`.

- [ ] **Step 4: Commit** — `feat(auth): add requireBaby entry point`

---

### Task 7: Cierre

- [ ] `npm run typecheck`, `npm run lint`, `npm test` (unit + integration), `npm run format:check`, `npm run build`.
- [ ] Advisors de seguridad y rendimiento del proyecto dev (la base de test no cambia el esquema de `postgres`, pero se revisa igualmente).
- [ ] `README.md`: marcar "Autorización en todas las queries y actions…" y añadir `npm run test:db` / `test:int` a la tabla de scripts y a la puesta en marcha.
- [ ] `CLAUDE.md` §7: base de datos de test en dev (D1), `npm test` = unit + integración (D3), `NotFoundError`, `requireBaby()` + "primer bebé" como bebé del MVP. §3.5: los tests de integración se llaman `*.int.test.ts`.
- [ ] Commit — `docs: record phase 2 authorization and test database decisions` y `git push` si se autoriza.

## Decisiones (resueltas el 2026-10-08)

- **D1 · Base de datos de test:** `baby_tracker_test` en dev (decisión 037).
- **D2 · `TRUNCATE`:** autorizado solo en `baby_tracker_test` (decisión 038).
- **D3 · `npm test`:** unit + integración (decisión 037).
