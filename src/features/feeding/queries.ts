import "server-only";

import type { BreastSide } from "@/features/feeding/service";
import type { Prisma } from "@/generated/prisma/client";
import type { DayRange } from "@/lib/dates";
import { db } from "@/lib/db";
import { isUuid, SESSION_LOOKBACK_MS } from "@/lib/records";

// Every query takes a babyId already authorized by requireBaby() (CLAUDE.md
// §2.2) and reads the (baby_id, started_at) index. Bottles are points in time
// with endedAt = null forever: only breast feedings can be "running".

const FEEDING_SELECT = {
  id: true,
  type: true,
  startedAt: true,
  endedAt: true,
  amountMl: true,
  bottleContent: true,
  notes: true,
  createdById: true,
  updatedById: true,
} satisfies Prisma.FeedingSelect;

export type FeedingItem = Prisma.FeedingGetPayload<{
  select: typeof FEEDING_SELECT;
}>;

const BREAST = { type: { not: "BOTTLE" } } satisfies Prisma.FeedingWhereInput;

/**
 * Feedings of one household day, newest first: every feeding that started
 * that day, plus breast feedings spilling over midnight or still running
 * (CLAUDE.md §2.5).
 */
export async function listFeedingsByDay(
  babyId: string,
  day: DayRange,
): Promise<FeedingItem[]> {
  const lookback = new Date(day.start.getTime() - SESSION_LOOKBACK_MS);
  return db.feeding.findMany({
    where: {
      babyId,
      startedAt: { lt: day.end },
      OR: [
        { startedAt: { gte: day.start } },
        { ...BREAST, startedAt: { gte: lookback }, endedAt: { gt: day.start } },
        { ...BREAST, endedAt: null },
      ],
    },
    orderBy: { startedAt: "desc" },
    select: FEEDING_SELECT,
  });
}

/** One feeding for its edit screen; null when missing, foreign or malformed. */
export async function getFeeding(
  babyId: string,
  id: string,
): Promise<FeedingItem | null> {
  if (!isUuid(id)) return null;
  return db.feeding.findFirst({
    where: { id, babyId },
    select: FEEDING_SELECT,
  });
}

/** The running breast feeding (at most one: partial unique index). */
export async function getActiveFeeding(
  babyId: string,
): Promise<FeedingItem | null> {
  return db.feeding.findFirst({
    where: { babyId, ...BREAST, endedAt: null },
    select: FEEDING_SELECT,
  });
}

/** The latest feeding of any kind ("comió hace 2 h"). */
export async function getLastFeeding(
  babyId: string,
): Promise<FeedingItem | null> {
  return db.feeding.findFirst({
    where: { babyId },
    orderBy: { startedAt: "desc" },
    select: FEEDING_SELECT,
  });
}

/** The latest breast feeding, running or not: input of suggestNextBreast. */
export async function getLastBreastFeeding(
  babyId: string,
): Promise<(FeedingItem & { type: BreastSide }) | null> {
  const feeding = await db.feeding.findFirst({
    where: { babyId, ...BREAST },
    orderBy: { startedAt: "desc" },
    select: FEEDING_SELECT,
  });
  // Excluded by the query; the check narrows the type for callers.
  if (!feeding || feeding.type === "BOTTLE") return null;
  return { ...feeding, type: feeding.type };
}
