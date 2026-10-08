import { describe, expect, it } from "vitest";

import { summarizeDay } from "@/features/dashboard/service";
import { getDayRange } from "@/lib/dates";

const MADRID = "Europe/Madrid";
const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
// Madrid is UTC+2 until Oct 25, 2026.
const OCT_1 = getDayRange(new Date("2026-10-01T12:00:00Z"), MADRID);
const OCT_2 = getDayRange(new Date("2026-10-02T12:00:00Z"), MADRID);
const LATER = new Date("2026-10-08T12:00:00Z");

const EMPTY = { feedings: [], diaperChanges: [], sleepSessions: [] };

describe("summarizeDay: sleep", () => {
  // 23:00 on Oct 1 → 01:00 on Oct 2, household time.
  const night = {
    startedAt: new Date("2026-10-01T21:00:00Z"),
    endedAt: new Date("2026-10-01T23:00:00Z"),
  };

  it("splits a sleep across midnight: 60 minutes on each day", () => {
    const input = { ...EMPTY, sleepSessions: [night] };

    expect(summarizeDay(input, OCT_1, LATER).sleep.totalMs).toBe(HOUR_MS);
    expect(summarizeDay(input, OCT_2, LATER).sleep.totalMs).toBe(HOUR_MS);
  });

  it("counts a sleep on the day it started", () => {
    const input = { ...EMPTY, sleepSessions: [night] };

    expect(summarizeDay(input, OCT_1, LATER).sleep.count).toBe(1);
    expect(summarizeDay(input, OCT_2, LATER).sleep.count).toBe(0);
  });

  it("counts a running sleep until now", () => {
    const now = new Date("2026-10-01T10:30:00Z");
    const running = {
      startedAt: new Date("2026-10-01T09:00:00Z"),
      endedAt: null,
    };

    const summary = summarizeDay(
      { ...EMPTY, sleepSessions: [running] },
      OCT_1,
      now,
    );

    expect(summary.sleep.totalMs).toBe(90 * MINUTE_MS);
  });

  it("measures the 25-hour day of the autumn time change", () => {
    const oct25 = getDayRange(new Date("2026-10-25T12:00:00Z"), MADRID);
    const allDay = { startedAt: oct25.start, endedAt: null };

    const summary = summarizeDay(
      { ...EMPTY, sleepSessions: [allDay] },
      oct25,
      oct25.end,
    );

    expect(summary.sleep.totalMs).toBe(25 * HOUR_MS);
  });
});

describe("summarizeDay: feedings", () => {
  const midnightBreast = {
    type: "BREAST_LEFT" as const,
    // 23:50 on Oct 1 → 00:10 on Oct 2.
    startedAt: new Date("2026-10-01T21:50:00Z"),
    endedAt: new Date("2026-10-01T22:10:00Z"),
    amountMl: null,
  };
  const bottle = (startedAt: string, amountMl: number) => ({
    type: "BOTTLE" as const,
    startedAt: new Date(startedAt),
    endedAt: null,
    amountMl,
  });

  it("adds up the bottles of the day", () => {
    const summary = summarizeDay(
      {
        ...EMPTY,
        feedings: [
          bottle("2026-10-01T07:00:00Z", 90),
          bottle("2026-10-01T11:00:00Z", 120),
        ],
      },
      OCT_1,
      LATER,
    );

    expect(summary.feedings).toMatchObject({
      count: 2,
      bottleCount: 2,
      bottleMl: 210,
      breastCount: 0,
      breastMs: 0,
    });
  });

  it("counts a breast feeding on its start day and splits its minutes", () => {
    const input = { ...EMPTY, feedings: [midnightBreast] };

    expect(summarizeDay(input, OCT_1, LATER).feedings).toMatchObject({
      count: 1,
      breastCount: 1,
      breastMs: 10 * MINUTE_MS,
    });
    expect(summarizeDay(input, OCT_2, LATER).feedings).toMatchObject({
      count: 0,
      breastCount: 0,
      breastMs: 10 * MINUTE_MS,
    });
  });

  it("never treats a bottle as time spent feeding", () => {
    const summary = summarizeDay(
      { ...EMPTY, feedings: [bottle("2026-10-01T07:00:00Z", 90)] },
      OCT_1,
      LATER,
    );

    expect(summary.feedings.breastMs).toBe(0);
  });
});

describe("summarizeDay: diapers", () => {
  const diaper = (type: "WET" | "DIRTY" | "MIXED", occurredAt: string) => ({
    type,
    occurredAt: new Date(occurredAt),
  });

  it("counts a mixed diaper as both wet and dirty", () => {
    const summary = summarizeDay(
      {
        ...EMPTY,
        diaperChanges: [
          diaper("WET", "2026-10-01T06:00:00Z"),
          diaper("WET", "2026-10-01T09:00:00Z"),
          diaper("DIRTY", "2026-10-01T12:00:00Z"),
          diaper("MIXED", "2026-10-01T15:00:00Z"),
        ],
      },
      OCT_1,
      LATER,
    );

    expect(summary.diapers).toEqual({ total: 4, wet: 3, dirty: 2 });
  });

  it("leaves out diapers of other days", () => {
    const summary = summarizeDay(
      {
        ...EMPTY,
        // 00:30 on Oct 2 in Madrid, still Oct 1 in UTC.
        diaperChanges: [diaper("WET", "2026-10-01T22:30:00Z")],
      },
      OCT_1,
      LATER,
    );

    expect(summary.diapers.total).toBe(0);
  });
});

describe("summarizeDay: empty day", () => {
  it("answers zeros, never missing numbers", () => {
    expect(summarizeDay(EMPTY, OCT_1, LATER)).toEqual({
      feedings: {
        count: 0,
        bottleCount: 0,
        bottleMl: 0,
        breastCount: 0,
        breastMs: 0,
      },
      diapers: { total: 0, wet: 0, dirty: 0 },
      sleep: { count: 0, totalMs: 0 },
    });
  });
});
