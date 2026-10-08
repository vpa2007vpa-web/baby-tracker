"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getMemberByUserId } from "@/features/auth/queries";
import { requireUserId } from "@/features/auth/session";
import { createHouseholdSchema } from "@/features/household/schemas";
import {
  actionError,
  type ActionResult,
  handleActionError,
  validationError,
} from "@/lib/action-result";
import { parseDateOnly } from "@/lib/dates";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

/**
 * Onboarding: the household, its OWNER (the caller) and the baby, created in
 * one statement. Idempotent: a double tap, or a user who already belongs to a
 * household, simply lands home. On success it redirects, so it only ever
 * returns errors.
 */
export async function createHousehold(input: unknown): Promise<ActionResult> {
  const userId = await requireUserId();
  const parsed = createHouseholdSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  const { householdId, babyId, displayName, babyName, babyBirthDate, babySex } =
    parsed.data;
  const birthDate = parseDateOnly(babyBirthDate, env.APP_TIMEZONE);
  if (!birthDate) {
    // Unreachable while the schema validates YYYY-MM-DD; kept so an invalid
    // date can never be stored.
    const message = "Indica la fecha de nacimiento.";
    return actionError("VALIDATION", message, { babyBirthDate: [message] });
  }

  try {
    if (!(await getMemberByUserId(userId))) {
      await db.household.create({
        data: {
          id: householdId,
          name: `Familia de ${displayName}`,
          members: { create: { userId, role: "OWNER", displayName } },
          babies: {
            create: { id: babyId, name: babyName, birthDate, sex: babySex },
          },
        },
        select: { id: true },
      });
    }
  } catch (error) {
    // A simultaneous double tap: the loser hits a unique key (household id or
    // member userId) once the winner commits; the winner's household stands.
    if (!(await getMemberByUserId(userId))) {
      return handleActionError("createHousehold", error);
    }
  }

  revalidatePath("/");
  redirect("/");
}
