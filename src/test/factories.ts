import { randomUUID } from "node:crypto";

import { getInviteExpiry, hashInviteCode } from "@/features/household/service";
import type { HouseholdRole } from "@/generated/prisma/client";
import { db } from "@/lib/db";

// Minimal valid rows for integration tests; every helper returns only ids.

export async function createHousehold(
  input: { name?: string } = {},
): Promise<{ householdId: string }> {
  const { id } = await db.household.create({
    data: { name: input.name ?? "Test household" },
    select: { id: true },
  });
  return { householdId: id };
}

export async function createMember(
  householdId: string,
  input: { role?: HouseholdRole; displayName?: string } = {},
): Promise<{ userId: string; memberId: string }> {
  const userId = randomUUID();
  const { id } = await db.householdMember.create({
    data: {
      householdId,
      userId,
      role: input.role ?? "OWNER",
      displayName: input.displayName ?? "Ana",
    },
    select: { id: true },
  });
  return { userId, memberId: id };
}

export async function createBaby(
  householdId: string,
  input: { name?: string; createdAt?: Date } = {},
): Promise<{ babyId: string }> {
  const { id } = await db.baby.create({
    data: {
      householdId,
      name: input.name ?? "Lucía",
      birthDate: new Date("2026-08-27T08:00:00Z"),
      createdAt: input.createdAt,
    },
    select: { id: true },
  });
  return { babyId: id };
}

export async function createFamily(): Promise<{
  householdId: string;
  userId: string;
  babyId: string;
}> {
  const { householdId } = await createHousehold();
  const { userId } = await createMember(householdId);
  const { babyId } = await createBaby(householdId);
  return { householdId, userId, babyId };
}

/** Stores the invite the way the app does: only the hash of `code`. */
export async function createInvite(
  householdId: string,
  input: { code: string; createdById: string; expiresAt?: Date; usedAt?: Date },
): Promise<{ inviteId: string }> {
  const { id } = await db.householdInvite.create({
    data: {
      householdId,
      codeHash: hashInviteCode(input.code),
      expiresAt: input.expiresAt ?? getInviteExpiry(new Date()),
      usedAt: input.usedAt,
      createdById: input.createdById,
    },
    select: { id: true },
  });
  return { inviteId: id };
}
