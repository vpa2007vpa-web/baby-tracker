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
