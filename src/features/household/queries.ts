import "server-only";

import type { HouseholdRole } from "@/generated/prisma/client";
import { db } from "@/lib/db";

export type HouseholdMemberSummary = {
  userId: string;
  displayName: string;
  role: HouseholdRole;
};

/** Members of an already authorized household, for "por Ana" and settings. */
export async function listHouseholdMembers(
  householdId: string,
): Promise<HouseholdMemberSummary[]> {
  return db.householdMember.findMany({
    where: { householdId },
    orderBy: { createdAt: "asc" },
    select: { userId: true, displayName: true, role: true },
  });
}

/**
 * Expiry of the household's usable invite, if any. Never returns the hash:
 * the code itself is shown only once, when it is created (ADR-043).
 */
export async function getPendingInvite(
  householdId: string,
  now: Date = new Date(),
): Promise<{ expiresAt: Date } | null> {
  return db.householdInvite.findFirst({
    where: { householdId, usedAt: null, expiresAt: { gt: now } },
    orderBy: { createdAt: "desc" },
    select: { expiresAt: true },
  });
}
