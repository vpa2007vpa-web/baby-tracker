import "server-only";

import { type DailySummary, summarizeDay } from "@/features/dashboard/service";
import { listDiaperChangesByDay } from "@/features/diapers/queries";
import { listFeedingsByDay } from "@/features/feeding/queries";
import { listSleepSessionsByDay } from "@/features/sleep/queries";
import type { DayRange } from "@/lib/dates";

// The dashboard is the one module allowed to read the others' queries
// (CLAUDE.md §2.9). Reusing the day listings keeps "Hoy" and each module's
// history in agreement, sessions across midnight included.

/** Totals of one household day for a baby already authorized by requireBaby(). */
export async function getDailySummary(
  babyId: string,
  day: DayRange,
  now: Date = new Date(),
): Promise<DailySummary> {
  const [feedings, diaperChanges, sleepSessions] = await Promise.all([
    listFeedingsByDay(babyId, day),
    listDiaperChangesByDay(babyId, day),
    listSleepSessionsByDay(babyId, day),
  ]);
  return summarizeDay({ feedings, diaperChanges, sleepSessions }, day, now);
}
