"use server";

import { revalidatePath } from "next/cache";

import { assertBabyInHousehold } from "@/features/auth/authorization";
import { requireMember } from "@/features/auth/session";
import {
  deleteHealthRecordSchema,
  healthRecordSchemas,
} from "@/features/health/schemas";
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

const schemas = healthRecordSchemas(env.APP_TIMEZONE);

function revalidateHealth(): void {
  revalidatePath("/");
  revalidatePath("/health");
}

export async function createHealthRecord(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const member = await requireMember();
  const parsed = schemas.createHealthRecordSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  const { id, babyId, ...record } = parsed.data;

  try {
    await assertBabyInHousehold(babyId, member.householdId);
    const healthRecord = await insertOnce(
      () =>
        db.healthRecord.create({
          data: { id, babyId, ...record, createdById: member.userId },
          select: { id: true },
        }),
      () =>
        db.healthRecord.findFirst({
          where: { id, baby: { householdId: member.householdId } },
          select: { id: true },
        }),
    );
    // No other unique index: the id belongs to another household.
    if (!healthRecord) throw new NotFoundError();

    revalidateHealth();
    return ok(healthRecord);
  } catch (error) {
    return handleActionError("createHealthRecord", error);
  }
}

/** Last write wins (CLAUDE.md §2.6); `updatedById` shows who edited it. */
export async function updateHealthRecord(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const member = await requireMember();
  const parsed = schemas.updateHealthRecordSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  const { id, ...record } = parsed.data;

  try {
    const { count } = await db.healthRecord.updateMany({
      where: { id, baby: { householdId: member.householdId } },
      data: {
        kind: record.kind,
        name: record.name,
        administeredAt: record.administeredAt,
        // null, not undefined: a field emptied in the form is cleared.
        doseAmount: record.doseAmount ?? null,
        doseUnit: record.doseUnit ?? null,
        doseNumber: record.doseNumber ?? null,
        reaction: record.reaction ?? null,
        notes: record.notes ?? null,
        updatedById: member.userId,
      },
    });
    if (count === 0) throw new NotFoundError();

    revalidateHealth();
    return ok({ id });
  } catch (error) {
    return handleActionError("updateHealthRecord", error);
  }
}

/** Idempotent: gone and never visible answer the same ok. */
export async function deleteHealthRecord(
  input: unknown,
): Promise<ActionResult> {
  const member = await requireMember();
  const parsed = deleteHealthRecordSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  try {
    await db.healthRecord.deleteMany({
      where: {
        id: parsed.data.id,
        baby: { householdId: member.householdId },
      },
    });
    revalidateHealth();
    return ok();
  } catch (error) {
    return handleActionError("deleteHealthRecord", error);
  }
}
