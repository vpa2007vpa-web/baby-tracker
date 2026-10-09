import { describe, expect, it } from "vitest";

import { describeSleepCounts } from "@/features/sleep/labels";

const MINUTE_MS = 60_000;

describe("describeSleepCounts", () => {
  it("counts the siestas and their time", () => {
    expect(describeSleepCounts({ count: 2, totalMs: 190 * MINUTE_MS })).toBe(
      "2 siestas · 3 h 10 min de sueño",
    );
  });

  it("uses the singular for one siesta", () => {
    expect(describeSleepCounts({ count: 1, totalMs: 45 * MINUTE_MS })).toBe(
      "1 siesta · 45 min de sueño",
    );
  });

  it("gives only the time of a night that began the day before", () => {
    expect(describeSleepCounts({ count: 0, totalMs: 7 * 60 * MINUTE_MS })).toBe(
      "7 h de sueño",
    );
  });
});
