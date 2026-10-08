"use server";

import { revalidatePath } from "next/cache";

import { assertBabyInHousehold } from "@/features/auth/authorization";
import { requireMember } from "@/features/auth/session";
import {
  deleteGrowthMeasurementSchema,
  growthMeasurementSchemas,
} from "@/features/growth/schemas";
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

const schemas = growthMeasurementSchemas(env.APP_TIMEZONE);

function revalidateGrowth(): void {
  revalidatePath("/");
  revalidatePath("/growth");
}

export async function createGrowthMeasurement(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const member = await requireMember();
  const parsed = schemas.createGrowthMeasurementSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  const { id, babyId, ...measurement } = parsed.data;

  try {
    await assertBabyInHousehold(babyId, member.householdId);
    const growthMeasurement = await insertOnce(
      () =>
        db.growthMeasurement.create({
          data: { id, babyId, ...measurement, createdById: member.userId },
          select: { id: true },
        }),
      () =>
        db.growthMeasurement.findFirst({
          where: { id, baby: { householdId: member.householdId } },
          select: { id: true },
        }),
    );
    // No other unique index: the id belongs to another household.
    if (!growthMeasurement) throw new NotFoundError();

    revalidateGrowth();
    return ok(growthMeasurement);
  } catch (error) {
    return handleActionError("createGrowthMeasurement", error);
  }
}

/** Last write wins (CLAUDE.md §2.6); `updatedById` shows who edited it. */
export async function updateGrowthMeasurement(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const member = await requireMember();
  const parsed = schemas.updateGrowthMeasurementSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  const { id, measuredAt, weightGrams, lengthMm, headCircumferenceMm } =
    parsed.data;

  try {
    const { count } = await db.growthMeasurement.updateMany({
      where: { id, baby: { householdId: member.householdId } },
      data: {
        measuredAt,
        // null, not undefined: a measure emptied in the form is cleared.
        weightGrams: weightGrams ?? null,
        lengthMm: lengthMm ?? null,
        headCircumferenceMm: headCircumferenceMm ?? null,
        updatedById: member.userId,
      },
    });
    if (count === 0) throw new NotFoundError();

    revalidateGrowth();
    return ok({ id });
  } catch (error) {
    return handleActionError("updateGrowthMeasurement", error);
  }
}

/** Idempotent: gone and never visible answer the same ok. */
export async function deleteGrowthMeasurement(
  input: unknown,
): Promise<ActionResult> {
  const member = await requireMember();
  const parsed = deleteGrowthMeasurementSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  try {
    await db.growthMeasurement.deleteMany({
      where: {
        id: parsed.data.id,
        baby: { householdId: member.householdId },
      },
    });
    revalidateGrowth();
    return ok();
  } catch (error) {
    return handleActionError("deleteGrowthMeasurement", error);
  }
}
