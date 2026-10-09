import { describe, expect, it } from "vitest";

import {
  describeDiaperTotals,
  describeFeedingTotals,
  describeSleepTotals,
} from "@/features/dashboard/labels";

const MINUTE_MS = 60_000;

describe("describeFeedingTotals", () => {
  it("counts feedings with breast time and bottle millilitres", () => {
    expect(
      describeFeedingTotals({
        count: 7,
        breastCount: 4,
        breastMs: 85 * MINUTE_MS,
        bottleCount: 3,
        bottleMl: 330,
      }),
    ).toEqual({
      value: "7",
      unit: "tomas",
      details: ["4 de pecho · 1 h 25 min", "3 biberones · 330 ml"],
    });
  });

  it("uses the singular and leaves out a kind the day did not have", () => {
    expect(
      describeFeedingTotals({
        count: 1,
        breastCount: 0,
        breastMs: 0,
        bottleCount: 1,
        bottleMl: 90,
      }),
    ).toEqual({ value: "1", unit: "toma", details: ["1 biberón · 90 ml"] });
  });

  it("keeps breast time that spilled over from the night before", () => {
    expect(
      describeFeedingTotals({
        count: 0,
        breastCount: 0,
        breastMs: 10 * MINUTE_MS,
        bottleCount: 0,
        bottleMl: 0,
      }),
    ).toEqual({ value: "0", unit: "tomas", details: ["0 de pecho · 10 min"] });
  });
});

describe("describeDiaperTotals", () => {
  it("splits wet and dirty, a mixed one counting in both", () => {
    expect(describeDiaperTotals({ total: 6, wet: 5, dirty: 3 })).toEqual({
      value: "6",
      unit: "pañales",
      details: ["5 mojados · 3 sucios"],
    });
  });

  it("uses the singular and says nothing more on an empty day", () => {
    expect(describeDiaperTotals({ total: 1, wet: 1, dirty: 1 })).toEqual({
      value: "1",
      unit: "pañal",
      details: ["1 mojado · 1 sucio"],
    });
    expect(describeDiaperTotals({ total: 0, wet: 0, dirty: 0 })).toEqual({
      value: "0",
      unit: "pañales",
      details: [],
    });
  });
});

describe("describeSleepTotals", () => {
  it("gives the time of sleep and the siestas", () => {
    expect(describeSleepTotals({ count: 3, totalMs: 580 * MINUTE_MS })).toEqual(
      { value: "9 h 40 min", unit: "de sueño", details: ["3 siestas"] },
    );
  });

  it("gives only the time of a night that began the day before", () => {
    expect(describeSleepTotals({ count: 0, totalMs: 420 * MINUTE_MS })).toEqual(
      { value: "7 h", unit: "de sueño", details: [] },
    );
    expect(describeSleepTotals({ count: 1, totalMs: 45 * MINUTE_MS })).toEqual({
      value: "45 min",
      unit: "de sueño",
      details: ["1 siesta"],
    });
  });
});
