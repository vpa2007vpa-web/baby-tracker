import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { isUuid } from "@/lib/records";

// Every query takes a babyId already authorized by requireBaby() (CLAUDE.md
// §2.2) and reads the (baby_id, administered_at) index.

/** Vaccines and occasional medicines: far below this cap in the MVP's span. */
const HISTORY_LIMIT = 100;

const HEALTH_RECORD_SELECT = {
  id: true,
  kind: true,
  name: true,
  doseAmount: true,
  doseUnit: true,
  doseNumber: true,
  administeredAt: true,
  reaction: true,
  notes: true,
  createdById: true,
  updatedById: true,
} satisfies Prisma.HealthRecordSelect;

export type HealthRecordItem = Prisma.HealthRecordGetPayload<{
  select: typeof HEALTH_RECORD_SELECT;
}>;

/** Vaccines and medications together, newest first. */
export async function listHealthRecords(
  babyId: string,
): Promise<HealthRecordItem[]> {
  return db.healthRecord.findMany({
    where: { babyId },
    orderBy: { administeredAt: "desc" },
    take: HISTORY_LIMIT,
    select: HEALTH_RECORD_SELECT,
  });
}

/** One record for its edit screen; null when missing, foreign or malformed. */
export async function getHealthRecord(
  babyId: string,
  id: string,
): Promise<HealthRecordItem | null> {
  if (!isUuid(id)) return null;
  return db.healthRecord.findFirst({
    where: { id, babyId },
    select: HEALTH_RECORD_SELECT,
  });
}
