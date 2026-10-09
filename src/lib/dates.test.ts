import { describe, expect, it } from "vitest";

import {
  addDaysToDate,
  formatDateInputValue,
  formatDateTimeLocalValue,
  formatDayLabel,
  formatDuration,
  formatRelativeDayTime,
  formatTime,
  formatTimeAgo,
  getDayRange,
  parseDateOnly,
  parseDateTimeLocal,
  resolveDay,
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

describe("parseDateOnly", () => {
  it("reads <input type=date> values as local midnight in the household zone", () => {
    expect(parseDateOnly("2026-08-27", MADRID)?.toISOString()).toBe(
      "2026-08-26T22:00:00.000Z",
    );
    expect(parseDateOnly("2026-01-15", MADRID)?.toISOString()).toBe(
      "2026-01-14T23:00:00.000Z",
    );
  });

  it.each(["", "2026-02-31", "27/08/2026", "2026-08-27T10:00"])(
    "rejects %j",
    (value) => {
      expect(parseDateOnly(value, MADRID)).toBeNull();
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

describe("formatDateInputValue", () => {
  it('returns the household-local date for <input type="date">', () => {
    // 22:30 UTC on Oct 8 is already Oct 9 in Madrid (UTC+2).
    expect(formatDateInputValue(new Date("2026-10-08T22:30:00Z"), MADRID)).toBe(
      "2026-10-09",
    );
  });

  it("keeps the same date when UTC and Madrid agree", () => {
    expect(formatDateInputValue(new Date("2026-10-08T12:00:00Z"), MADRID)).toBe(
      "2026-10-08",
    );
  });
});

describe("formatRelativeDayTime", () => {
  // 14:00 on Oct 8 in Madrid.
  const NOW = new Date("2026-10-08T12:00:00Z");

  it("says hoy for a later time on the same household day", () => {
    expect(
      formatRelativeDayTime(new Date("2026-10-08T16:00:00Z"), NOW, MADRID),
    ).toBe("hoy a las 18:00");
  });

  it("says mañana for the next household day", () => {
    expect(
      formatRelativeDayTime(new Date("2026-10-09T10:30:00Z"), NOW, MADRID),
    ).toBe("mañana a las 12:30");
  });

  it("uses the household day, not the UTC day, around midnight", () => {
    // 23:30 and 00:30 in Madrid, while both instants are Oct 8 in UTC.
    const lateNight = new Date("2026-10-08T21:30:00Z");
    expect(
      formatRelativeDayTime(
        new Date("2026-10-08T22:30:00Z"),
        lateNight,
        MADRID,
      ),
    ).toBe("mañana a las 00:30");
  });

  it("falls back to the date beyond tomorrow", () => {
    expect(
      formatRelativeDayTime(new Date("2026-10-12T07:00:00Z"), NOW, MADRID),
    ).toBe("el 12/10 a las 09:00");
  });
});

describe("formatDateTimeLocalValue", () => {
  it('writes the household wall-clock time for <input type="datetime-local">', () => {
    // 23:30 UTC on Oct 8 is 01:30 on Oct 9 in Madrid.
    expect(
      formatDateTimeLocalValue(new Date("2026-10-08T23:30:00Z"), MADRID),
    ).toBe("2026-10-09T01:30");
  });

  it("round-trips with parseDateTimeLocal", () => {
    const instant = new Date("2026-10-08T12:34:00Z");
    expect(
      parseDateTimeLocal(formatDateTimeLocalValue(instant, MADRID), MADRID),
    ).toEqual(instant);
  });
});

describe("addDaysToDate", () => {
  it("moves across months and years", () => {
    expect(addDaysToDate("2026-10-01", -1)).toBe("2026-09-30");
    expect(addDaysToDate("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("is plain calendar arithmetic, unaffected by DST", () => {
    expect(addDaysToDate("2026-10-25", 1)).toBe("2026-10-26");
  });
});

describe("resolveDay", () => {
  // 01:30 on Oct 9 in Madrid, still Oct 8 in UTC.
  const NOW = new Date("2026-10-08T23:30:00Z");

  it("is today in the household zone without a parameter", () => {
    expect(resolveDay(undefined, NOW, MADRID)).toEqual({
      date: "2026-10-09",
      isToday: true,
      range: getDayRange(NOW, MADRID),
    });
  });

  it("reads a past day", () => {
    const day = resolveDay("2026-10-01", NOW, MADRID);
    expect(day.date).toBe("2026-10-01");
    expect(day.isToday).toBe(false);
    expect(day.range.start.toISOString()).toBe("2026-09-30T22:00:00.000Z");
  });

  it.each(["2026-10-10", "2026-02-31", "ayer", ""])(
    "falls back to today for %j (future, impossible or malformed)",
    (param) => {
      expect(resolveDay(param, NOW, MADRID).date).toBe("2026-10-09");
    },
  );
});

describe("formatDayLabel", () => {
  const NOW = new Date("2026-10-08T23:30:00Z"); // Oct 9 in Madrid

  it("says Hoy and Ayer in the household zone", () => {
    expect(
      formatDayLabel(resolveDay("2026-10-09", NOW, MADRID), NOW, MADRID),
    ).toBe("Hoy");
    expect(
      formatDayLabel(resolveDay("2026-10-08", NOW, MADRID), NOW, MADRID),
    ).toBe("Ayer");
  });

  it("names older days briefly, in Spanish", () => {
    expect(
      formatDayLabel(resolveDay("2026-10-01", NOW, MADRID), NOW, MADRID),
    ).toBe("jue 1 oct");
  });
});
