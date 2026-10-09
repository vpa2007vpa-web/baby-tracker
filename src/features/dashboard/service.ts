import type { DiaperType, FeedingType } from "@/generated/prisma/enums";
import type { DayRange } from "@/lib/dates";

// Pure daily summary (CLAUDE.md §2.3, §2.5): no database, no implicit time
// zone. The day comes from getDayRange() in the household zone, so DST days
// last 23 or 25 hours on their own.
//
// - Counts belong to the day an entry starts: a feeding at 23:50 is one
//   feeding of that day.
// - Durations are split by the stretch that falls in each day: a sleep from
//   23:00 to 01:00 adds 60 minutes to each. A running session lasts until
//   `now`.

type TimedEntry = { startedAt: Date; endedAt: Date | null };

export type SummaryFeeding = TimedEntry & {
  type: FeedingType;
  amountMl: number | null;
};
export type SummaryDiaperChange = { type: DiaperType; occurredAt: Date };
export type SummarySleepSession = TimedEntry;

export type DailySummaryInput = {
  feedings: readonly SummaryFeeding[];
  diaperChanges: readonly SummaryDiaperChange[];
  sleepSessions: readonly SummarySleepSession[];
};

export type DailySummary = {
  feedings: {
    count: number;
    bottleCount: number;
    bottleMl: number;
    breastCount: number;
    breastMs: number;
  };
  /** MIXED counts as both wet and dirty, as paediatricians count them. */
  diapers: { total: number; wet: number; dirty: number };
  sleep: { count: number; totalMs: number };
};

function isWithin(instant: Date, day: DayRange): boolean {
  return instant >= day.start && instant < day.end;
}

/** Milliseconds of [startedAt, endedAt ?? now) that fall inside `day`. */
function overlapMs(entry: TimedEntry, day: DayRange, now: Date): number {
  const start = Math.max(entry.startedAt.getTime(), day.start.getTime());
  const end = Math.min((entry.endedAt ?? now).getTime(), day.end.getTime());
  return Math.max(0, end - start);
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

/**
 * The feeding part of the day, also shown on the Tomas screen: feedings
 * that started this day, millilitres of their bottles, and breast time
 * split by the stretch inside the day (a running one lasts until `now`).
 */
export function summarizeFeedings(
  feedings: readonly SummaryFeeding[],
  day: DayRange,
  now: Date,
): DailySummary["feedings"] {
  const feedingsOfDay = feedings.filter((feeding) =>
    isWithin(feeding.startedAt, day),
  );
  const bottlesOfDay = feedingsOfDay.filter(
    (feeding) => feeding.type === "BOTTLE",
  );
  // Bottles are points in time: only breast feedings take time.
  const breastFeedings = feedings.filter(
    (feeding) => feeding.type !== "BOTTLE",
  );

  return {
    count: feedingsOfDay.length,
    bottleCount: bottlesOfDay.length,
    bottleMl: sum(bottlesOfDay.map((bottle) => bottle.amountMl ?? 0)),
    breastCount: feedingsOfDay.length - bottlesOfDay.length,
    breastMs: sum(
      breastFeedings.map((feeding) => overlapMs(feeding, day, now)),
    ),
  };
}

/**
 * The sleep part of the day, also shown on the Sueño screen: sessions that
 * started this day, and sleep time split by the stretch inside the day (a
 * night from the day before adds its morning part; a running one lasts
 * until `now`).
 */
export function summarizeSleep(
  sessions: readonly SummarySleepSession[],
  day: DayRange,
  now: Date,
): DailySummary["sleep"] {
  return {
    count: sessions.filter((session) => isWithin(session.startedAt, day))
      .length,
    totalMs: sum(sessions.map((session) => overlapMs(session, day, now))),
  };
}

export function summarizeDay(
  input: DailySummaryInput,
  day: DayRange,
  now: Date,
): DailySummary {
  const diapersOfDay = input.diaperChanges.filter((diaper) =>
    isWithin(diaper.occurredAt, day),
  );

  return {
    feedings: summarizeFeedings(input.feedings, day, now),
    diapers: {
      total: diapersOfDay.length,
      wet: diapersOfDay.filter(
        (diaper) => diaper.type === "WET" || diaper.type === "MIXED",
      ).length,
      dirty: diapersOfDay.filter(
        (diaper) => diaper.type === "DIRTY" || diaper.type === "MIXED",
      ).length,
    },
    sleep: summarizeSleep(input.sleepSessions, day, now),
  };
}
