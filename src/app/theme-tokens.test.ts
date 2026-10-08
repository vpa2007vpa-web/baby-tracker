import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const MODULES = ["feeding", "diapers", "sleep", "growth", "health"] as const;
const WCAG_AA_TEXT = 4.5;
const WCAG_AA_NON_TEXT = 3;

const css = readFileSync(
  fileURLToPath(new URL("./globals.css", import.meta.url)),
  "utf8",
);

function readBlock(selector: string): string {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`Missing ${selector} block in globals.css`);
  return css.slice(start, css.indexOf("}", start));
}

function readOklch(block: string, token: string): [number, number, number] {
  const match = new RegExp(
    `--${token}:\\s*oklch\\(([\\d.]+)\\s+([\\d.]+)\\s+([\\d.]+)\\)`,
  ).exec(block);
  if (!match?.[1] || !match[2] || !match[3]) {
    throw new Error(`Missing opaque oklch token --${token}`);
  }
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

  it.each(MODULES)("%s accent is readable as text on the page", (m) => {
    expect(contrast(block, m, "background")).toBeGreaterThanOrEqual(
      WCAG_AA_TEXT,
    );
  });

  it.each(MODULES)("%s soft surface keeps body text readable", (m) => {
    expect(contrast(block, "foreground", `${m}-soft`)).toBeGreaterThanOrEqual(
      WCAG_AA_TEXT,
    );
  });

  it.each(MODULES)("%s accent icons stand out on its soft surface", (m) => {
    expect(contrast(block, m, `${m}-soft`)).toBeGreaterThanOrEqual(
      WCAG_AA_NON_TEXT,
    );
  });
});

// The bottom navigation's neutral states (components/layout/bottom-nav-list):
// inactive tabs are muted text on the page, and Hoy and Más mark the active
// tab with a muted pill behind a foreground icon.
describe.each([
  ["light", ":root"],
  ["dark", ".dark"],
])("bottom navigation neutral states (%s)", (_mode, selector) => {
  const block = readBlock(selector);

  it("keeps inactive tab labels readable", () => {
    expect(
      contrast(block, "muted-foreground", "background"),
    ).toBeGreaterThanOrEqual(WCAG_AA_TEXT);
  });

  it("makes the active icon stand out on the neutral pill", () => {
    expect(contrast(block, "foreground", "muted")).toBeGreaterThanOrEqual(
      WCAG_AA_NON_TEXT,
    );
  });
});
