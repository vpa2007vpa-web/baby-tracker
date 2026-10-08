import "server-only";

import { z } from "zod";

import { NotFoundError } from "@/lib/action-result";
import { db } from "@/lib/db";

const babyIdSchema = z.uuid();

/**
 * Prisma bypasses RLS, so every query and action checks ownership in code
 * (CLAUDE.md §2.7). Foreign, missing and malformed ids all throw the same
 * NotFoundError, so a response never reveals that a record exists.
 */
export async function assertBabyInHousehold(
  babyId: string,
  householdId: string,
): Promise<void> {
  // A malformed id would otherwise surface as a database error, not a 404.
  if (!babyIdSchema.safeParse(babyId).success) throw new NotFoundError();

  const baby = await db.baby.findFirst({
    where: { id: babyId, householdId },
    select: { id: true },
  });
  if (!baby) throw new NotFoundError();
}
