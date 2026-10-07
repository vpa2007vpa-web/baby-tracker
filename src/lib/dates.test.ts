import { describe, expect, it } from "vitest";

import {
  formatDuration,
  formatTime,
  formatTimeAgo,
  getDayRange,
  parseDateTimeLocal,
} from "@/lib/dates";

const MADRID = "Europe/Madrid";
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

describe("getDayRange", () => {
  it("returns the household-local natural day, not the server's UTC day", () => {
    // 23:30 UTC on Oct 7 is already Oct 8 in Madrid (UTC+2).
    const { start, end } = getDayRange(
      new Date("2026-10-07T23:30:00Z"),
      MADRID,
    );
    expect(start.toISOString()).toBe("2026-10-07T22:00:00.000Z");
    expect(end.toISOString()).toBe("2026-10-08T22:00:00.000Z");
  });

  it("spans 25 hours on the autumn DST change", () => {
    const { start, end } = getDayRange(
      new Date("2026-10-25T12:00:00Z"),
      MADRID,
    );
    expect(start.toISOString()).toBe("2026-10-24T22:00:00.000Z");
    expect(end.toISOString()).toBe("2026-10-25T23:00:00.000Z");
  });

  it("spans 23 hours on the spring DST change", () => {
    const { start, end } = getDayRange(
      new Date("2026-03-29T12:00:00Z"),
      MADRID,
    );
    expect(start.toISOString()).toBe("2026-03-28T23:00:00.000Z");
    expect(end.toISOString()).toBe("2026-03-29T22:00:00.000Z");
  });
});

describe("parseDateTimeLocal", () => {
  it("reads <input type=datetime-local> values in the household time zone", () => {
    expect(parseDateTimeLocal("2026-10-08T14:30", MADRID)?.toISOString()).toBe(
      "2026-10-08T12:30:00.000Z",
    );
  });

  it("accepts optional seconds", () => {
    expect(
      parseDateTimeLocal("2026-01-15T08:05:30", MADRID)?.toISOString(),
    ).toBe("2026-01-15T07:05:30.000Z");
  });

  it.each(["", "2026-10-08", "2026-10-08 14:30", "2026-02-31T10:00", "nope"])(
    "rejects %j",
    (value) => {
      expect(parseDateTimeLocal(value, MADRID)).toBeNull();
    },
  );
});

describe("formatTime", () => {
  it("uses 24 h format in the household time zone", () => {
    expect(formatTime(new Date("2026-10-08T12:30:00Z"), MADRID)).toBe("14:30");
    expect(formatTime(new Date("2026-10-07T22:05:00Z"), MADRID)).toBe("00:05");
  });
});

describe("formatDuration", () => {
  it.each([
    [0, "0 min"],
    [59_999, "0 min"],
    [25 * MINUTE, "25 min"],
    [HOUR, "1 h"],
    [HOUR + 20 * MINUTE, "1 h 20 min"],
    [-5 * MINUTE, "0 min"],
  ])("formats %d ms as %j", (ms, expected) => {
    expect(formatDuration(ms)).toBe(expected);
  });
});

describe("formatTimeAgo", () => {
  const now = new Date("2026-10-08T12:00:00Z");

  it.each([
    [new Date(now.getTime() - 30_000), "ahora mismo"],
    [new Date(now.getTime() + 5 * MINUTE), "ahora mismo"],
    [new Date(now.getTime() - 25 * MINUTE), "hace 25 min"],
    [new Date(now.getTime() - (HOUR + 20 * MINUTE)), "hace 1 h 20 min"],
    [new Date(now.getTime() - 26 * HOUR), "hace 1 día"],
    [new Date(now.getTime() - 72 * HOUR), "hace 3 días"],
  ])("formats %s relative to now as %j", (date, expected) => {
    expect(formatTimeAgo(date, now)).toBe(expected);
  });
});
