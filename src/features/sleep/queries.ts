import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import type { DayRange } from "@/lib/dates";
import { db } from "@/lib/db";
import { isUuid, SESSION_LOOKBACK_MS } from "@/lib/records";

// Every query takes a babyId already authorized by requireBaby() (CLAUDE.md
// §2.2) and reads the (baby_id, started_at) index.

const SLEEP_SESSION_SELECT = {
  id: true,
  startedAt: true,
  endedAt: true,
  notes: true,
  createdById: true,
  updatedById: true,
} satisfies Prisma.SleepSessionSelect;

export type SleepSessionItem = Prisma.SleepSessionGetPayload<{
  select: typeof SLEEP_SESSION_SELECT;
}>;

/**
 * Sessions that overlap one household day, newest first: a night across
 * midnight shows on both days (CLAUDE.md §2.5) and the running one too.
 */
export async function listSleepSessionsByDay(
  babyId: string,
  day: DayRange,
): Promise<SleepSessionItem[]> {
  const lookback = new Date(day.start.getTime() - SESSION_LOOKBACK_MS);
  return db.sleepSession.findMany({
    where: {
      babyId,
      startedAt: { lt: day.end },
      OR: [
        { startedAt: { gte: day.start } },
        { startedAt: { gte: lookback }, endedAt: { gt: day.start } },
        { endedAt: null },
      ],
    },
    orderBy: { startedAt: "desc" },
    select: SLEEP_SESSION_SELECT,
  });
}

/** One session for its edit screen; null when missing, foreign or malformed. */
export async function getSleepSession(
  babyId: string,
  id: string,
): Promise<SleepSessionItem | null> {
  if (!isUuid(id)) return null;
  return db.sleepSession.findFirst({
    where: { id, babyId },
    select: SLEEP_SESSION_SELECT,
  });
}

/** The running timer (at most one: partial unique index), with its author. */
export async function getActiveSleepSession(
  babyId: string,
): Promise<SleepSessionItem | null> {
  return db.sleepSession.findFirst({
    where: { babyId, endedAt: null },
    select: SLEEP_SESSION_SELECT,
  });
}

/** The latest finished session ("durmió por última vez…"). */
export async function getLastSleepSession(
  babyId: string,
): Promise<SleepSessionItem | null> {
  return db.sleepSession.findFirst({
    where: { babyId, endedAt: { not: null } },
    orderBy: { startedAt: "desc" },
    select: SLEEP_SESSION_SELECT,
  });
}
