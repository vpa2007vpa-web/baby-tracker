import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { isUuid } from "@/lib/records";

// Every query takes a babyId already authorized by requireBaby() (CLAUDE.md
// §2.2) and reads the (baby_id, measured_at) index.

/** A measurement every few weeks: years of history fit well under this cap. */
const HISTORY_LIMIT = 100;

const GROWTH_MEASUREMENT_SELECT = {
  id: true,
  measuredAt: true,
  weightGrams: true,
  lengthMm: true,
  headCircumferenceMm: true,
  createdById: true,
  updatedById: true,
} satisfies Prisma.GrowthMeasurementSelect;

export type GrowthMeasurementItem = Prisma.GrowthMeasurementGetPayload<{
  select: typeof GROWTH_MEASUREMENT_SELECT;
}>;

/** The baby's history, newest first. */
export async function listGrowthMeasurements(
  babyId: string,
): Promise<GrowthMeasurementItem[]> {
  return db.growthMeasurement.findMany({
    where: { babyId },
    orderBy: { measuredAt: "desc" },
    take: HISTORY_LIMIT,
    select: GROWTH_MEASUREMENT_SELECT,
  });
}

/** One measurement for its edit screen; null when missing, foreign or malformed. */
export async function getGrowthMeasurement(
  babyId: string,
  id: string,
): Promise<GrowthMeasurementItem | null> {
  if (!isUuid(id)) return null;
  return db.growthMeasurement.findFirst({
    where: { id, babyId },
    select: GROWTH_MEASUREMENT_SELECT,
  });
}

export async function getLatestGrowthMeasurement(
  babyId: string,
): Promise<GrowthMeasurementItem | null> {
  return db.growthMeasurement.findFirst({
    where: { babyId },
    orderBy: { measuredAt: "desc" },
    select: GROWTH_MEASUREMENT_SELECT,
  });
}
