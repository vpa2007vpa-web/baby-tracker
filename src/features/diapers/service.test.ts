import { describe, expect, it } from "vitest";

import {
  describeDiaperCounts,
  DIAPER_TYPE_LABELS,
  STOOL_COLOR_LABELS,
  STOOL_COLOR_ORDER,
  STOOL_CONSISTENCY_LABELS,
  STOOL_CONSISTENCY_ORDER,
} from "@/features/diapers/labels";
import { countDiaperChanges } from "@/features/diapers/service";
import {
  DiaperType,
  StoolColor,
  StoolConsistency,
} from "@/generated/prisma/enums";

describe("countDiaperChanges", () => {
  it("counts a mixed diaper as both wet and dirty", () => {
    expect(
      countDiaperChanges([
        { type: "WET" },
        { type: "WET" },
        { type: "DIRTY" },
        { type: "MIXED" },
      ]),
    ).toEqual({ total: 4, wet: 3, dirty: 2 });
  });

  it("answers zeros for an empty day", () => {
    expect(countDiaperChanges([])).toEqual({ total: 0, wet: 0, dirty: 0 });
  });
});

describe("describeDiaperCounts", () => {
  it("reads the day at a glance, in Spanish plurals", () => {
    expect(describeDiaperCounts({ total: 6, wet: 5, dirty: 2 })).toBe(
      "6 pañales · 5 mojados · 2 sucios",
    );
    expect(describeDiaperCounts({ total: 1, wet: 1, dirty: 0 })).toBe(
      "1 pañal · 1 mojado · 0 sucios",
    );
  });
});

describe("labels", () => {
  it("names every diaper type, stool color and consistency", () => {
    for (const type of Object.values(DiaperType)) {
      expect(DIAPER_TYPE_LABELS[type]).toBeTruthy();
    }
    for (const color of Object.values(StoolColor)) {
      expect(STOOL_COLOR_LABELS[color]).toBeTruthy();
    }
    for (const consistency of Object.values(StoolConsistency)) {
      expect(STOOL_CONSISTENCY_LABELS[consistency]).toBeTruthy();
    }
  });

  it("offers every stool color and consistency in the form, once", () => {
    expect([...STOOL_COLOR_ORDER].sort()).toEqual(
      Object.values(StoolColor).sort(),
    );
    expect([...STOOL_CONSISTENCY_ORDER].sort()).toEqual(
      Object.values(StoolConsistency).sort(),
    );
  });
});
