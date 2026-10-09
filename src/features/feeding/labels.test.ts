import { describe, expect, it } from "vitest";

import {
  BOTTLE_CONTENT_LABELS,
  describeFeedingCounts,
  describeLastFeeding,
  FEEDING_TYPE_LABELS,
  FEEDING_TYPE_SHORT_LABELS,
  QUICK_BOTTLE_AMOUNTS_ML,
} from "@/features/feeding/labels";
import { BottleContent, FeedingType } from "@/generated/prisma/enums";

const MINUTE_MS = 60_000;

describe("labels", () => {
  it("names every feeding type and milk", () => {
    for (const type of Object.values(FeedingType)) {
      expect(FEEDING_TYPE_LABELS[type]).toBeTruthy();
      expect(FEEDING_TYPE_SHORT_LABELS[type]).toBeTruthy();
    }
    for (const content of Object.values(BottleContent)) {
      expect(BOTTLE_CONTENT_LABELS[content]).toBeTruthy();
    }
  });

  it("offers the usual bottle amounts of the roadmap", () => {
    expect(QUICK_BOTTLE_AMOUNTS_ML).toEqual([60, 90, 120, 150]);
  });
});

describe("describeFeedingCounts", () => {
  it("reads the day at a glance", () => {
    expect(
      describeFeedingCounts({
        count: 7,
        bottleCount: 3,
        bottleMl: 330,
        breastCount: 4,
        breastMs: 85 * MINUTE_MS,
      }),
    ).toBe("7 tomas · 4 de pecho (1 h 25 min) · 3 biberones (330 ml)");
  });

  it("leaves out a kind of feeding the day did not have", () => {
    expect(
      describeFeedingCounts({
        count: 1,
        bottleCount: 1,
        bottleMl: 90,
        breastCount: 0,
        breastMs: 0,
      }),
    ).toBe("1 toma · 1 biberón (90 ml)");
  });

  it("still shows breast time that spilled over from the day before", () => {
    expect(
      describeFeedingCounts({
        count: 0,
        bottleCount: 0,
        bottleMl: 0,
        breastCount: 0,
        breastMs: 10 * MINUTE_MS,
      }),
    ).toBe("0 tomas · 0 de pecho (10 min)");
  });
});

describe("describeLastFeeding", () => {
  const start = new Date("2026-10-09T08:00:00Z");

  it("gives a finished breast feeding's side and length", () => {
    expect(
      describeLastFeeding({
        type: "BREAST_LEFT",
        startedAt: start,
        endedAt: new Date(start.getTime() + 15 * 60_000),
        amountMl: null,
      }),
    ).toBe("Pecho izquierdo · 15 min");
  });

  it("says a breast feeding is still running", () => {
    expect(
      describeLastFeeding({
        type: "BREAST_RIGHT",
        startedAt: start,
        endedAt: null,
        amountMl: null,
      }),
    ).toBe("Pecho derecho · en curso");
  });

  it("gives a bottle's amount", () => {
    expect(
      describeLastFeeding({
        type: "BOTTLE",
        startedAt: start,
        endedAt: null,
        amountMl: 120,
      }),
    ).toBe("Biberón · 120 ml");
  });
});
