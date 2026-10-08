import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import type { DayRange } from "@/lib/dates";
import { db } from "@/lib/db";
import { isUuid } from "@/lib/records";

// Every query takes a babyId already authorized by requireBaby() (CLAUDE.md
// §2.2). Day listings and "last" lookups use the (baby_id, occurred_at) index.

const DIAPER_CHANGE_SELECT = {
  id: true,
  occurredAt: true,
  type: true,
  stoolColor: true,
  stoolConsistency: true,
  notes: true,
  createdById: true,
  updatedById: true,
} satisfies Prisma.DiaperChangeSelect;

export type DiaperChangeItem = Prisma.DiaperChangeGetPayload<{
  select: typeof DIAPER_CHANGE_SELECT;
}>;

/** Diapers of one household day (half-open range), newest first. */
export async function listDiaperChangesByDay(
  babyId: string,
  day: DayRange,
): Promise<DiaperChangeItem[]> {
  return db.diaperChange.findMany({
    where: { babyId, occurredAt: { gte: day.start, lt: day.end } },
    orderBy: { occurredAt: "desc" },
    select: DIAPER_CHANGE_SELECT,
  });
}

/** One diaper for its edit screen; null when missing, foreign or malformed. */
export async function getDiaperChange(
  babyId: string,
  id: string,
): Promise<DiaperChangeItem | null> {
  if (!isUuid(id)) return null;
  return db.diaperChange.findFirst({
    where: { id, babyId },
    select: DIAPER_CHANGE_SELECT,
  });
}

export async function getLastDiaperChange(
  babyId: string,
): Promise<DiaperChangeItem | null> {
  return db.diaperChange.findFirst({
    where: { babyId },
    orderBy: { occurredAt: "desc" },
    select: DIAPER_CHANGE_SELECT,
  });
}
