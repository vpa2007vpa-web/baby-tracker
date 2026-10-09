import "server-only";

import type { DoseUnit, Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { isUuid } from "@/lib/records";

// Every query takes a babyId already authorized by requireBaby() (CLAUDE.md
// §2.2) and reads the (baby_id, administered_at) index.

/** Vaccines and occasional medicines: far below this cap in the MVP's span. */
const HISTORY_LIMIT = 100;

/** How many recent medications the new form offers to repeat. */
const RECENT_MEDICATIONS = 4;
/** Enough rows to find four distinct names among repeated doses. */
const RECENT_MEDICATIONS_SCAN = 50;

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

export type RecentMedication = {
  /** As last typed, without surrounding spaces. */
  name: string;
  doseAmount: number | null;
  doseUnit: DoseUnit | null;
};

/**
 * The last dose of each recently given medication, newest first, for the
 * one-tap repeat of the new form (§4.2). Names are compared ignoring case
 * and spaces: "Apiretal" and "apiretal " are the same medicine. Reads the
 * latest rows by the (baby_id, administered_at) index and dedupes here.
 */
export async function listRecentMedications(
  babyId: string,
): Promise<RecentMedication[]> {
  const records = await db.healthRecord.findMany({
    where: { babyId, kind: "MEDICATION" },
    orderBy: { administeredAt: "desc" },
    take: RECENT_MEDICATIONS_SCAN,
    select: { name: true, doseAmount: true, doseUnit: true },
  });
  const byName = new Map<string, RecentMedication>();
  for (const record of records) {
    const name = record.name.trim();
    const key = name.toLocaleLowerCase("es");
    if (!byName.has(key)) byName.set(key, { ...record, name });
    if (byName.size === RECENT_MEDICATIONS) break;
  }
  return [...byName.values()];
}
