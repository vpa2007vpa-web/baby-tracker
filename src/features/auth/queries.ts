import "server-only";

import type { HouseholdRole } from "@/generated/prisma/client";
import { db } from "@/lib/db";

export type Member = {
  memberId: string;
  userId: string;
  householdId: string;
  role: HouseholdRole;
  displayName: string;
};

export async function getMemberByUserId(
  userId: string,
): Promise<Member | null> {
  const member = await db.householdMember.findUnique({
    where: { userId },
    select: { id: true, householdId: true, role: true, displayName: true },
  });
  if (!member) return null;
  return {
    memberId: member.id,
    userId,
    householdId: member.householdId,
    role: member.role,
    displayName: member.displayName,
  };
}

/**
 * Name of a member of `householdId`, for "iniciada por Ana". Null for anyone
 * else (a former member, another household), so it never reveals a name
 * from outside the family.
 */
export async function getMemberDisplayName(
  userId: string,
  householdId: string,
): Promise<string | null> {
  const member = await db.householdMember.findFirst({
    where: { userId, householdId },
    select: { displayName: true },
  });
  return member?.displayName ?? null;
}

export type CurrentBaby = { id: string; name: string; birthDate: Date };

/**
 * The MVP shows one baby per household: the first one created. The schema
 * already supports several (the selector is in the backlog).
 */
export async function getPrimaryBaby(
  householdId: string,
): Promise<CurrentBaby | null> {
  return db.baby.findFirst({
    where: { householdId },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, birthDate: true },
  });
}
