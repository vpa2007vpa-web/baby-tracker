# Fase 1 · Paso 1 — Infraestructura Core · Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** dejar un proyecto Next.js 16 que compila, con TypeScript estricto, Tailwind CSS 4 + shadcn/ui (tokens por módulo y modo oscuro), Prettier, ESLint endurecido y Vitest funcionando, sin tocar `CLAUDE.md`, `README.md` (salvo el roadmap) ni `.env`.

**Architecture:** se genera el esqueleto con `create-next-app@16.4.0` en un directorio temporal (el del proyecto no está vacío y la CLI lo rechazaría) y se fusiona en la raíz sin sobrescribir los archivos existentes. shadcn/ui se inicializa sobre ese esqueleto; los colores de módulo se añaden como tokens CSS en `globals.css` y se protegen con un test de contraste WCAG AA.

**Tech Stack:** Node 24.15 · Next.js 16.4.0 · React 19.3.0 · TypeScript ^5 (la que propone `create-next-app`) · Tailwind CSS ^4 (`@tailwindcss/turbopack`) · shadcn CLI 4.21.4 · next-themes (dependencia de `sonner` en shadcn) · Prettier 3 + `prettier-plugin-tailwindcss` 0.8 · ESLint 9 + `eslint-config-next` 16.4.0 · Vitest 5.

**Spec:** [`CLAUDE.md`](../../../CLAUDE.md) (reglas) y [`README.md` → Roadmap → Fase 1](../../../README.md) (alcance).

## Global Constraints

- Node.js 24 LTS (instalado: v24.15.0). `@types/node` alineado con Node 24.
- `next@16.4.0`, `react@19.3.0`, `eslint-config-next@16.4.0`. TypeScript: la mayor que fije `create-next-app` (`^5`); **no** subir a TS 7.
- No añadir dependencias sin justificar (regla 0.7). Las de este paso: las del esqueleto, las que instala shadcn por componente, `prettier`, `prettier-plugin-tailwindcss` y `vitest`.
- Código, identificadores y comentarios en inglés; textos de UI en español (`lang="es"`).
- Colores solo mediante tokens CSS (`globals.css`, `@theme`). Prohibido `bg-[#…]` / `text-[#…]`.
- Modo oscuro desde el día 1: sigue `prefers-color-scheme`, con interruptor manual posible (`next-themes`, `attribute="class"`).
- Contraste WCAG AA: texto ≥ 4,5:1; iconos y elementos gráficos ≥ 3:1.
- Mobile-first: comprobar a 375 × 667 y 390 × 844, sin scroll horizontal.
- Prohibidos `any`, aserciones no nulas `!`, `@ts-ignore`, `interface` (usar `type`) y `console.log`.
- `CLAUDE.md`, `README.md` (salvo casillas del roadmap), `.env`, `.claude/` y `skills-lock.json` no se sobrescriben.

## Review Focus

1. **Fusión del esqueleto sobre archivos existentes:** `CLAUDE.md`, `README.md`, `.env` y `.claude/` deben quedar byte a byte iguales → verificación con hash antes/después (Task 1).
2. **`next dev` reescribe archivos de agentes:** el bloque de `AGENTS.md` se regenera en `next dev`; hay que confirmar que no inyecta nada en `CLAUDE.md` → inspección de `generate-agent-files.js` y hash tras arrancar `next dev` (Task 1).
3. **Secretos en git:** `.env` debe estar ignorado y `.env.example` no → `git check-ignore` (Task 1).
4. **Contraste de los colores de módulo en claro y oscuro:** cualquier ajuste futuro de tokens no debe bajar de AA → test de contraste (Task 6).
5. **Parpadeo o *hydration mismatch* del tema oscuro:** al cargar con el sistema en oscuro no debe verse un destello claro ni avisos de hidratación → comprobación en el navegador (Task 7).

---

### Task 1: Esqueleto Next.js fusionado en la raíz + git

**Files:**
- Create (desde el esqueleto): `package.json`, `package-lock.json`, `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `next-env.d.ts`, `AGENTS.md`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `src/app/favicon.ico`
- Modify: `.gitignore` (fusión)
- No copiar: `README.md`, `CLAUDE.md` (si lo hubiera), `.gitignore` del esqueleto, `public/*.svg` de ejemplo

**Interfaces:**
- Produces: scripts `dev`, `build`, `start`, `lint`; alias `@/*` → `./src/*`.

- [ ] **Step 1: Guardar hashes de los archivos protegidos**

```bash
cd /c/Users/vpach/Desktop/Metricas-bebe
sha256sum CLAUDE.md README.md .env skills-lock.json > "$SCRATCH/protected.sha256"
```

(`$SCRATCH` = directorio scratchpad de la sesión.)

- [ ] **Step 2: Generar el esqueleto en el scratchpad**

```bash
cd "$SCRATCH" && rm -rf scaffold
npx -y create-next-app@16.4.0 scaffold --ts --tailwind --eslint --app --src-dir \
  --import-alias "@/*" --use-npm --no-react-compiler --agents-md --no-agent-feedback \
  --disable-git --skip-install --yes
```

Expected: `Success! Created scaffold`. `next.config.ts` trae `cacheComponents: true` y `partialPrefetching: true` (por defecto en 16.4; ver decisión pendiente D3).

- [ ] **Step 3: Copiar el esqueleto sin pisar nada existente**

```bash
cd "$SCRATCH/scaffold"
cp -n package.json next.config.ts tsconfig.json eslint.config.mjs next-env.d.ts AGENTS.md /c/Users/vpach/Desktop/Metricas-bebe/
mkdir -p /c/Users/vpach/Desktop/Metricas-bebe/src/app /c/Users/vpach/Desktop/Metricas-bebe/public
cp -n src/app/* /c/Users/vpach/Desktop/Metricas-bebe/src/app/
```

En `package.json`: `"name": "metricas-bebe"` y `"engines": { "node": ">=24" }`.

- [ ] **Step 4: Fusionar `.gitignore`**

Contenido final (se mantiene la sección de secretos actual, que permite `.env.example`):

```gitignore
# Secretos
.env
.env*.local
!.env.example

# dependencies
/node_modules
/.pnp
.pnp.*

# testing
/coverage

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts

# prisma (cliente generado)
/src/generated/
```

- [ ] **Step 5: Instalar y alinear tipos de Node**

```bash
cd /c/Users/vpach/Desktop/Metricas-bebe
npm install
npm install -D @types/node@^24
```

- [ ] **Step 6: Comprobar qué reescribe `next dev`**

```bash
grep -n "CLAUDE.md\|AGENTS.md" node_modules/next/dist/server/lib/generate-agent-files.js
```

Si toca `CLAUDE.md`, buscar en ese archivo la opción de desactivarlo y aplicarla antes de arrancar `next dev`. Si no, conservar `AGENTS.md` (apunta a la documentación de Next instalada en `node_modules/next/dist/docs/`, útil para la regla 4).

- [ ] **Step 7: Ajustar el layout raíz (idioma y metadatos)**

`src/app/layout.tsx`: `lang="es"` y metadatos en español.

```tsx
export const metadata: Metadata = {
  title: "Métricas Bebé",
  description: "Registro rápido de tomas, pañales, sueño, crecimiento y salud del bebé.",
};
```

- [ ] **Step 8: git init y verificación de ignorados**

```bash
git init
git check-ignore -q .env && echo ".env ignorado: OK"
touch .env.example && (git check-ignore -q .env.example && echo "FALLO: .env.example ignorado" || echo ".env.example versionable: OK") && rm .env.example
```

Expected: `.env ignorado: OK` y `.env.example versionable: OK`. (`.env.example` real se crea en el Paso 2.)

- [ ] **Step 9: Build y hashes**

```bash
npm run build
```

Arrancar `npm run dev` en segundo plano, esperar a `Ready`, pararlo y comprobar:

```bash
sha256sum -c "$SCRATCH/protected.sha256"
```

Expected: build OK; los cuatro archivos `OK`.

- [ ] **Step 10: Commit** *(solo si el usuario autoriza commits)*

```bash
git add -A && git commit -m "chore: scaffold Next.js 16 app"
```

---

### Task 2: TypeScript estricto + script `typecheck`

**Files:**
- Modify: `tsconfig.json`, `package.json`

- [ ] **Step 1: Comprobar que hoy el código inseguro compila (test en rojo)**

```bash
mkdir -p src/__probe__ && printf 'const xs: number[] = [];\nexport const first: number = xs[0];\n' > src/__probe__/probe.ts
npx tsc --noEmit
```

Expected: **sin error** (todavía falta `noUncheckedIndexedAccess`).

- [ ] **Step 2: Endurecer `tsconfig.json`**

Añadir en `compilerOptions`:

```json
"noUncheckedIndexedAccess": true,
"noImplicitOverride": true,
"noFallthroughCasesInSwitch": true,
"forceConsistentCasingInFileNames": true
```

Y en `package.json` → `scripts`: `"typecheck": "tsc --noEmit"`.

- [ ] **Step 3: Verificar que ahora falla**

Run: `npm run typecheck`
Expected: `error TS2322: Type 'number | undefined' is not assignable to type 'number'.`

- [ ] **Step 4: Borrar la sonda y verificar en verde**

```bash
rm -rf src/__probe__ && npm run typecheck
```

Expected: sin errores.

- [ ] **Step 5: Commit** *(si se autoriza)* — `chore: harden TypeScript compiler options`

---

### Task 3: ESLint endurecido + Prettier

**Files:**
- Modify: `eslint.config.mjs`, `package.json`
- Create: `.prettierrc.json`, `.prettierignore`

- [ ] **Step 1: Instalar Prettier**

```bash
npm install -D prettier prettier-plugin-tailwindcss
```

- [ ] **Step 2: `.prettierrc.json`**

```json
{
  "plugins": ["prettier-plugin-tailwindcss"],
  "tailwindStylesheet": "./src/app/globals.css"
}
```

- [ ] **Step 3: `.prettierignore`**

```
.next/
node_modules/
src/generated/
src/components/ui/
package-lock.json
CLAUDE.md
README.md
docs/
```

(`components/ui` se deja tal cual lo genera shadcn para que `shadcn add --diff` siga siendo legible; los `.md` mantienen su formato manual.)

- [ ] **Step 4: Reglas de `CLAUDE.md` en ESLint**

`eslint.config.mjs`:

```js
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Mechanical enforcement of CLAUDE.md §3.2 and §3.5.
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/ban-ts-comment": [
        "error",
        { "ts-expect-error": "allow-with-description" },
      ],
      "@typescript-eslint/consistent-type-definitions": ["error", "type"],
      "no-console": ["error", { allow: ["error"] }],
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "src/generated/**"]),
]);

export default eslintConfig;
```

- [ ] **Step 5: Verificar que las reglas muerden (rojo)**

```bash
mkdir -p src/__probe__ && printf 'export interface Foo { a: string }\nexport const f = (x: string | null): number => x!.length;\nconsole.log(f);\n' > src/__probe__/probe.ts
npm run lint
```

Expected: 3 errores (`consistent-type-definitions`, `no-non-null-assertion`, `no-console`).

- [ ] **Step 6: Borrar la sonda, scripts y verde**

```bash
rm -rf src/__probe__
```

`package.json` → `scripts`: `"format": "prettier --write ."`, `"format:check": "prettier --check ."`.

```bash
npm run format && npm run lint && npm run format:check
```

Expected: todo en verde.

- [ ] **Step 7: Commit** *(si se autoriza)* — `chore: add Prettier and enforce project lint rules`

---

### Task 4: shadcn/ui + componentes base

**Files:**
- Create: `components.json`, `src/lib/utils.ts`, `src/components/ui/{button,card,input,label,field,toggle-group,tabs,sonner,alert-dialog,skeleton,input-otp}.tsx` (+ dependencias internas que arrastre `field`, p. ej. `separator`)
- Modify: `src/app/globals.css`, `package.json`

**Interfaces:**
- Produces: `cn(...inputs: ClassValue[]): string` en `@/lib/utils`; componentes en `@/components/ui/*`; `Toaster` en `@/components/ui/sonner`.

- [ ] **Step 1: Inicializar** (librería base y preset según decisiones D1/D2; recomendado `base` + estilo Maia)

```bash
npx -y shadcn@4.21.4 init --base base --preset <preset elegido en D2> --no-monorepo --css-variables --no-rtl --yes
```

- [ ] **Step 2: Añadir componentes**

```bash
npx -y shadcn@4.21.4 add button card input label field toggle-group tabs sonner alert-dialog skeleton input-otp --yes
```

`Field` sustituye a `Form` del roadmap: el componente `form` del registro solo existe en la variante Radix *legacy* y la documentación actual de shadcn integra React Hook Form con `Field` + `Controller` (sigue cumpliendo CLAUDE.md §2.4: RHF + `zodResolver`).

- [ ] **Step 3: Revisar dependencias añadidas**

```bash
git diff package.json   # o comparar a mano si no hay commit previo
```

Esperadas: `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `tw-animate-css`, la librería base (`@base-ui/react` o `radix-ui`), `sonner`, `next-themes`, `input-otp`. Cualquier otra se justifica o se retira.

- [ ] **Step 4: Typecheck y lint sobre el código generado**

Run: `npm run typecheck && npm run lint`
Expected: verde. Si los flags estrictos rompen un componente generado, corregir el tipo mínimo en ese archivo y anotarlo en el resumen (único ajuste permitido en `components/ui/`).

- [ ] **Step 5: Commit** *(si se autoriza)* — `feat(ui): initialize shadcn/ui with base components`

---

### Task 5: Vitest

**Files:**
- Create: `vitest.config.ts`, `src/lib/utils.test.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `cn` de `@/lib/utils` (Task 4).
- Produces: scripts `test` y `test:watch`; resolución del alias `@/` en tests.

- [ ] **Step 1: Instalar**

```bash
npm install -D vitest
```

- [ ] **Step 2: Test que falla (sin config, el alias `@/` no resuelve)**

`src/lib/utils.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { cn } from "@/lib/utils";

describe("cn", () => {
  it("lets the last conflicting Tailwind class win", () => {
    expect(cn("h-12 px-2", "px-4")).toBe("h-12 px-4");
  });

  it("drops falsy values", () => {
    const isActive = false;
    expect(cn("text-base", isActive && "font-bold", undefined)).toBe("text-base");
  });
});
```

Run: `npx vitest run`
Expected: FAIL — `Failed to resolve import "@/lib/utils"`.

- [ ] **Step 3: `vitest.config.ts`**

```ts
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
```

`package.json` → `scripts`: `"test": "vitest run"`, `"test:watch": "vitest"`.

- [ ] **Step 4: Verde**

Run: `npm test`
Expected: `2 passed`.

- [ ] **Step 5: Commit** *(si se autoriza)* — `test: set up Vitest with path alias`

---

### Task 6: Tokens de color por módulo + test de contraste AA

**Files:**
- Create: `src/app/theme-tokens.test.ts`
- Modify: `src/app/globals.css`

**Interfaces:**
- Produces: utilidades Tailwind `bg-feeding`, `text-feeding`, `bg-feeding-soft`, … para `feeding`, `diapers`, `sleep`, `growth`, `health`.
  - `--<m>`: acento del módulo (icono, borde, texto sobre `--background`).
  - `--<m>-soft`: superficie tintada sobre la que va texto `--foreground`.

- [ ] **Step 1: Evaluar la skill `design:design-system`** y ajustar los valores propuestos abajo si la skill lo justifica (manteniendo el test).

- [ ] **Step 2: Test que falla**

`src/app/theme-tokens.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const MODULES = ["feeding", "diapers", "sleep", "growth", "health"] as const;
const WCAG_AA_TEXT = 4.5;
const WCAG_AA_NON_TEXT = 3;

const css = readFileSync(fileURLToPath(new URL("./globals.css", import.meta.url)), "utf8");

function readBlock(selector: string): string {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`Missing ${selector} block in globals.css`);
  const end = css.indexOf("}", start);
  return css.slice(start, end);
}

function readOklch(block: string, token: string): [number, number, number] {
  const match = new RegExp(`--${token}:\\s*oklch\\(([\\d.]+)\\s+([\\d.]+)\\s+([\\d.]+)\\)`).exec(block);
  if (!match?.[1] || !match[2] || !match[3]) throw new Error(`Missing opaque oklch token --${token}`);
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

// OKLCH → linear sRGB (Björn Ottosson's OKLab matrices) → WCAG relative luminance.
function relativeLuminance([l, c, h]: [number, number, number]): number {
  const a = c * Math.cos((h * Math.PI) / 180);
  const b = c * Math.sin((h * Math.PI) / 180);
  const lc = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const mc = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const sc = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const clamp = (v: number): number => Math.min(1, Math.max(0, v));
  const r = clamp(4.0767416621 * lc - 3.3077115913 * mc + 0.2309699292 * sc);
  const g = clamp(-1.2684380046 * lc + 2.6097574011 * mc - 0.3413193965 * sc);
  const bl = clamp(-0.0041960863 * lc - 0.7034186147 * mc + 1.707614701 * sc);
  return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
}

function contrast(block: string, fg: string, bg: string): number {
  const a = relativeLuminance(readOklch(block, fg));
  const b = relativeLuminance(readOklch(block, bg));
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

describe.each([
  ["light", ":root"],
  ["dark", ".dark"],
])("module color tokens (%s)", (_mode, selector) => {
  const block = readBlock(selector);

  it.each(MODULES)("%s accent is readable as text on the page background", (m) => {
    expect(contrast(block, m, "background")).toBeGreaterThanOrEqual(WCAG_AA_TEXT);
  });

  it.each(MODULES)("%s soft surface keeps body text readable", (m) => {
    expect(contrast(block, "foreground", `${m}-soft`)).toBeGreaterThanOrEqual(WCAG_AA_TEXT);
  });

  it.each(MODULES)("%s accent icons stand out on its soft surface", (m) => {
    expect(contrast(block, m, `${m}-soft`)).toBeGreaterThanOrEqual(WCAG_AA_NON_TEXT);
  });
});
```

Run: `npm test`
Expected: FAIL — `Missing opaque oklch token --feeding`.

- [ ] **Step 3: Añadir los tokens a `globals.css`**

Al final del bloque `:root` generado por shadcn:

```css
  /* Module colors: always paired with an icon and a text label (CLAUDE.md §4.4). */
  --feeding: oklch(0.5 0.13 55);
  --feeding-soft: oklch(0.95 0.03 55);
  --diapers: oklch(0.5 0.1 200);
  --diapers-soft: oklch(0.95 0.03 200);
  --sleep: oklch(0.5 0.15 280);
  --sleep-soft: oklch(0.95 0.03 280);
  --growth: oklch(0.5 0.12 145);
  --growth-soft: oklch(0.95 0.03 145);
  --health: oklch(0.5 0.15 15);
  --health-soft: oklch(0.95 0.03 15);
```

Al final del bloque `.dark` (tonos apagados, sin brillos intensos para uso nocturno):

```css
  --feeding: oklch(0.75 0.11 55);
  --feeding-soft: oklch(0.28 0.04 55);
  --diapers: oklch(0.75 0.09 200);
  --diapers-soft: oklch(0.28 0.04 200);
  --sleep: oklch(0.75 0.11 280);
  --sleep-soft: oklch(0.28 0.04 280);
  --growth: oklch(0.75 0.11 145);
  --growth-soft: oklch(0.28 0.04 145);
  --health: oklch(0.75 0.11 15);
  --health-soft: oklch(0.28 0.04 15);
```

Dentro de `@theme inline`:

```css
  --color-feeding: var(--feeding);
  --color-feeding-soft: var(--feeding-soft);
  --color-diapers: var(--diapers);
  --color-diapers-soft: var(--diapers-soft);
  --color-sleep: var(--sleep);
  --color-sleep-soft: var(--sleep-soft);
  --color-growth: var(--growth);
  --color-growth-soft: var(--growth-soft);
  --color-health: var(--health);
  --color-health-soft: var(--health-soft);
```

- [ ] **Step 4: Verde**

Run: `npm test`
Expected: `32 passed` (2 de `cn` + 30 de contraste). Si algún par no llega, bajar `L` del acento en claro / subirlo en oscuro, nunca relajar el umbral.

- [ ] **Step 5: Commit** *(si se autoriza)* — `feat(ui): add module color tokens with AA contrast test`

---

### Task 7: Modo oscuro, Toaster y pantalla de comprobación

**Files:**
- Create: `src/components/layout/theme-provider.tsx`
- Modify: `src/app/layout.tsx`, `src/app/page.tsx`
- Delete: `public/*.svg` de ejemplo si se hubieran copiado

**Interfaces:**
- Consumes: `Toaster` (Task 4), tokens (Task 6).
- Produces: `ThemeProvider` (`next-themes`, `attribute="class"`, `defaultTheme="system"`) usable por el futuro interruptor de Ajustes.

- [ ] **Step 1: `src/components/layout/theme-provider.tsx`**

```tsx
"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps, ReactNode } from "react";

type ThemeProviderProps = Omit<ComponentProps<typeof NextThemesProvider>, "children"> & {
  children: ReactNode;
};

export function ThemeProvider({ children, ...props }: ThemeProviderProps): ReactNode {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
```

- [ ] **Step 2: Layout raíz**

`src/app/layout.tsx` (Server Component): `<html lang="es" suppressHydrationWarning>` (next-themes cambia la clase antes de hidratar) y dentro de `<body>`:

```tsx
<ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
  {children}
  <Toaster />
</ThemeProvider>
```

Añadir `export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: [...] }` con `themeColor` claro/oscuro tomado de `--background`.

- [ ] **Step 3: Página de comprobación temporal (`src/app/page.tsx`)**

Server Component en español con `mx-auto w-full max-w-md px-4`: título "Métricas Bebé", un `Button` `h-14 w-full` ("Empezar") y cinco filas `bg-<m>-soft` con icono `lucide-react` (`Milk`, `Baby`, `Moon`, `Ruler`, `Syringe`, 20 px, `text-<m>`) + texto ("Tomas", "Pañales", "Sueño", "Crecimiento", "Salud"). Se sustituye por el dashboard en la Fase 3–4.

- [ ] **Step 4: Comprobación visual**

`npm run dev` y, en el navegador integrado: 375 × 667 y 390 × 844, claro y oscuro (`colorScheme`). Verificar: sin scroll horizontal, sin destello claro al cargar en oscuro, sin avisos de hidratación en consola (salvo el aviso conocido de `next-themes` sobre `<script>` con React 19, que es solo de desarrollo).

- [ ] **Step 5: Cierre del paso**

```bash
npm run typecheck && npm run lint && npm test && npm run format:check && npm run build
sha256sum -c "$SCRATCH/protected.sha256"   # CLAUDE.md debe seguir intacto; README.md cambiará en el siguiente paso
```

- [ ] **Step 6: Documentación**

- `README.md` → marcar `[x]`: inicializar Next.js, endurecer `tsconfig.json`, Prettier + scripts, inicializar shadcn/ui.
- `CLAUDE.md` §7 → filas nuevas (019+): librería base de shadcn (D1), `Field` en lugar de `Form`, Cache Components (D3), `next-themes` vía `sonner`, reglas de ESLint que automatizan §3.2.

- [ ] **Step 7: Commit** *(si se autoriza)* — `feat(ui): add theme provider, toaster and smoke page`

---

## Decisiones (resueltas el 2026-10-07)

- **D1 · Librería base:** Base UI (decisión 019).
- **D2 · Estilo:** Maia con iconos Lucide (decisión 019).
- **D3 · Cache Components:** activado (decisión 021).
- **D4 · Supabase:** `baby-tracker` = dev (decisión 026).
