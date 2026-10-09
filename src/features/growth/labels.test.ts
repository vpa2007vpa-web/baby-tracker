import { describe, expect, it } from "vitest";

import {
  describeWeightChanges,
  formatLength,
  formatWeight,
  toFormDecimal,
} from "@/features/growth/labels";

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-10-09T10:00:00Z");

function daysAgo(days: number): Date {
  return new Date(NOW.getTime() - days * DAY_MS);
}

describe("formatWeight", () => {
  it.each([
    [5250, "5,25 kg"],
    [4855, "4,855 kg"],
    [3200, "3,2 kg"],
    [4000, "4 kg"],
    [12500, "12,5 kg"],
  ])("%i g reads %s", (grams, expected) => {
    expect(formatWeight(grams)).toBe(expected);
  });
});

describe("formatLength", () => {
  it.each([
    [565, "56,5 cm"],
    [560, "56 cm"],
    [1025, "102,5 cm"],
  ])("%i mm reads %s", (mm, expected) => {
    expect(formatLength(mm)).toBe(expected);
  });
});

describe("toFormDecimal", () => {
  it("writes stored units back as the parent typed them", () => {
    expect(toFormDecimal(4850, 1000)).toBe("4,85");
    expect(toFormDecimal(565, 10)).toBe("56,5");
    expect(toFormDecimal(12000, 1000)).toBe("12");
  });

  it("leaves a missing measure empty", () => {
    expect(toFormDecimal(null, 1000)).toBeUndefined();
  });
});

describe("describeWeightChanges", () => {
  it("compares each weight with the previous one, newest first", () => {
    const changes = describeWeightChanges([
      { id: "c", measuredAt: daysAgo(0), weightGrams: 5250 },
      { id: "b", measuredAt: daysAgo(14), weightGrams: 4900 },
      { id: "a", measuredAt: daysAgo(21), weightGrams: 4950 },
    ]);

    expect(changes.get("c")).toBe("+350 g en 14 días");
    expect(changes.get("b")).toBe("−50 g en 7 días");
    expect(changes.has("a")).toBe(false);
  });

  it("skips measurements without a weight", () => {
    const changes = describeWeightChanges([
      { id: "c", measuredAt: daysAgo(0), weightGrams: 5000 },
      { id: "b", measuredAt: daysAgo(5), weightGrams: null },
      { id: "a", measuredAt: daysAgo(10), weightGrams: 4800 },
    ]);

    expect(changes.get("c")).toBe("+200 g en 10 días");
    expect(changes.has("b")).toBe(false);
  });

  it("says the same day, one day, no change and kilos", () => {
    const changes = describeWeightChanges([
      { id: "d", measuredAt: daysAgo(0), weightGrams: 6500 },
      { id: "c", measuredAt: daysAgo(31), weightGrams: 5250 },
      { id: "b", measuredAt: daysAgo(32), weightGrams: 5250 },
      {
        id: "a",
        measuredAt: new Date(daysAgo(32).getTime() - 3_600_000),
        weightGrams: 5200,
      },
    ]);

    expect(changes.get("d")).toBe("+1,25 kg en 31 días");
    expect(changes.get("c")).toBe("Sin cambios en 1 día");
    expect(changes.get("b")).toBe("+50 g el mismo día");
  });
});
