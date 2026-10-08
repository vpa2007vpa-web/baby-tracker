"use server";

import { revalidatePath } from "next/cache";

import { assertBabyInHousehold } from "@/features/auth/authorization";
import { requireMember } from "@/features/auth/session";
import {
  deleteDiaperChangeSchema,
  diaperChangeSchemas,
} from "@/features/diapers/schemas";
import {
  type ActionResult,
  handleActionError,
  NotFoundError,
  ok,
  validationError,
} from "@/lib/action-result";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { insertOnce } from "@/lib/records";

const schemas = diaperChangeSchemas(env.APP_TIMEZONE);

function revalidateDiapers(): void {
  revalidatePath("/");
  revalidatePath("/diapers");
}

export async function createDiaperChange(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const member = await requireMember();
  const parsed = schemas.createDiaperChangeSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  const { id, babyId, occurredAt, ...diaper } = parsed.data;

  try {
    await assertBabyInHousehold(babyId, member.householdId);
    const diaperChange = await insertOnce(
      () =>
        db.diaperChange.create({
          data: {
            id,
            babyId,
            occurredAt: occurredAt ?? new Date(),
            ...diaper,
            createdById: member.userId,
          },
          select: { id: true },
        }),
      () =>
        db.diaperChange.findFirst({
          where: { id, baby: { householdId: member.householdId } },
          select: { id: true },
        }),
    );
    // Diapers have no other unique index: the id belongs to another household.
    if (!diaperChange) throw new NotFoundError();

    revalidateDiapers();
    return ok(diaperChange);
  } catch (error) {
    return handleActionError("createDiaperChange", error);
  }
}

/** Last write wins (CLAUDE.md §2.6); `updatedById` shows who edited it. */
export async function updateDiaperChange(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const member = await requireMember();
  const parsed = schemas.updateDiaperChangeSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  const { id, occurredAt, type, stoolColor, stoolConsistency, notes } =
    parsed.data;

  try {
    // One statement scoped to the household: nothing to race between a
    // check and the write.
    const { count } = await db.diaperChange.updateMany({
      where: { id, baby: { householdId: member.householdId } },
      data: {
        occurredAt,
        type,
        // null, not undefined: a field emptied in the form is cleared.
        stoolColor: stoolColor ?? null,
        stoolConsistency: stoolConsistency ?? null,
        notes: notes ?? null,
        updatedById: member.userId,
      },
    });
    if (count === 0) throw new NotFoundError();

    revalidateDiapers();
    return ok({ id });
  } catch (error) {
    return handleActionError("updateDiaperChange", error);
  }
}

/**
 * Idempotent: a diaper already deleted, by a retry or by the other parent,
 * answers ok, exactly like one that was never visible to this household.
 */
export async function deleteDiaperChange(
  input: unknown,
): Promise<ActionResult> {
  const member = await requireMember();
  const parsed = deleteDiaperChangeSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  try {
    await db.diaperChange.deleteMany({
      where: {
        id: parsed.data.id,
        baby: { householdId: member.householdId },
      },
    });
    revalidateDiapers();
    return ok();
  } catch (error) {
    return handleActionError("deleteDiaperChange", error);
  }
}
