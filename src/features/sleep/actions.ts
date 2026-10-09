"use server";

import { revalidatePath } from "next/cache";

import { assertBabyInHousehold } from "@/features/auth/authorization";
import { getMemberDisplayName } from "@/features/auth/queries";
import { type Member, requireMember } from "@/features/auth/session";
import { getActiveSleepSession } from "@/features/sleep/queries";
import {
  deleteSleepSessionSchema,
  sleepSessionSchemas,
  stopSleepSessionSchema,
} from "@/features/sleep/schemas";
import { resolveSleepStart } from "@/features/sleep/service";
import type { Prisma } from "@/generated/prisma/client";
import {
  actionError,
  type ActionResult,
  handleActionError,
  NotFoundError,
  ok,
  validationError,
} from "@/lib/action-result";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { insertOnce } from "@/lib/records";

// Timers (CLAUDE.md §2.4, §2.6): the running session lives in the database
// (endedAt = null), so both parents' devices see it and either can stop it.
// PostgreSQL enforces one running session per baby with a partial unique
// index; these actions only translate its answers.

const schemas = sleepSessionSchemas(env.APP_TIMEZONE);

const TIMER_SELECT = {
  id: true,
  startedAt: true,
  endedAt: true,
} satisfies Prisma.SleepSessionSelect;

export type SleepTimerState = {
  id: string;
  startedAt: string;
  endedAt: string | null;
};

function toTimerState(session: {
  id: string;
  startedAt: Date;
  endedAt: Date | null;
}): SleepTimerState {
  return {
    id: session.id,
    startedAt: session.startedAt.toISOString(),
    endedAt: session.endedAt?.toISOString() ?? null,
  };
}

function revalidateSleep(): void {
  revalidatePath("/");
  revalidatePath("/sleep");
}

/** "Ya hay una siesta en curso, iniciada por Ana" (or "por ti"). */
async function runningSessionConflict(
  babyId: string,
  member: Member,
): Promise<ActionResult<never>> {
  const running = await getActiveSleepSession(babyId);
  // Stopped in the meantime by the other parent: a retry will succeed.
  if (!running) {
    return actionError(
      "CONFLICT",
      "No se ha podido iniciar la siesta. Inténtalo de nuevo.",
    );
  }
  const author =
    running.createdById === member.userId
      ? "ti"
      : await getMemberDisplayName(running.createdById, member.householdId);
  return actionError(
    "CONFLICT",
    author
      ? `Ya hay una siesta en curso, iniciada por ${author}.`
      : "Ya hay una siesta en curso.",
  );
}

export async function startSleepSession(
  input: unknown,
): Promise<ActionResult<SleepTimerState>> {
  const member = await requireMember();
  const parsed = schemas.startSleepSessionSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  const { id, babyId, minutesAgo } = parsed.data;
  const now = new Date();
  // A start a few minutes ahead (phone clock drift, tolerated by the schema)
  // is clamped, so stopping right away never ends before it began.
  const asked = resolveSleepStart({
    now,
    minutesAgo,
    startedAt: parsed.data.startedAt,
  });

  try {
    await assertBabyInHousehold(babyId, member.householdId);
    // Only a start in the past can overlap the previous sleep.
    const previous =
      asked < now
        ? await db.sleepSession.findFirst({
            where: { babyId, endedAt: { gt: asked } },
            orderBy: { endedAt: "desc" },
            select: { endedAt: true },
          })
        : null;
    const startedAt = resolveSleepStart({
      now,
      startedAt: asked,
      previousEndedAt: previous?.endedAt,
    });
    const session = await insertOnce(
      () =>
        db.sleepSession.create({
          data: { id, babyId, startedAt, createdById: member.userId },
          select: TIMER_SELECT,
        }),
      () =>
        db.sleepSession.findFirst({
          where: { id, baby: { householdId: member.householdId } },
          select: TIMER_SELECT,
        }),
    );
    if (!session) {
      // Either another household's id, or the partial unique index refused
      // a second running session.
      const isIdTaken = (await db.sleepSession.count({ where: { id } })) > 0;
      if (isIdTaken) throw new NotFoundError();
      return await runningSessionConflict(babyId, member);
    }

    revalidateSleep();
    return ok(toTimerState(session));
  } catch (error) {
    return handleActionError("startSleepSession", error);
  }
}

/**
 * Idempotent stop on the server clock. When the update matches nothing, the
 * other parent (or a retry) already stopped it: that is a success too, and
 * the stored end time is returned unchanged.
 */
export async function stopSleepSession(
  input: unknown,
): Promise<ActionResult<SleepTimerState & { wasAlreadyStopped: boolean }>> {
  const member = await requireMember();
  const parsed = stopSleepSessionSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  const scope = {
    id: parsed.data.id,
    baby: { householdId: member.householdId },
  };

  try {
    const { count } = await db.sleepSession.updateMany({
      where: { ...scope, endedAt: null },
      data: { endedAt: new Date(), updatedById: member.userId },
    });
    const session = await db.sleepSession.findFirst({
      where: scope,
      select: TIMER_SELECT,
    });
    if (!session) throw new NotFoundError();

    revalidateSleep();
    return ok({ ...toTimerState(session), wasAlreadyStopped: count === 0 });
  } catch (error) {
    return handleActionError("stopSleepSession", error);
  }
}

/** A finished sleep typed by hand; it never competes with a running timer. */
export async function createSleepSession(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const member = await requireMember();
  const parsed = schemas.createSleepSessionSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  const { id, babyId, ...sleep } = parsed.data;

  try {
    await assertBabyInHousehold(babyId, member.householdId);
    const session = await insertOnce(
      () =>
        db.sleepSession.create({
          data: { id, babyId, ...sleep, createdById: member.userId },
          select: { id: true },
        }),
      () =>
        db.sleepSession.findFirst({
          where: { id, baby: { householdId: member.householdId } },
          select: { id: true },
        }),
    );
    // A finished session is outside the partial index: the id is foreign.
    if (!session) throw new NotFoundError();

    revalidateSleep();
    return ok(session);
  } catch (error) {
    return handleActionError("createSleepSession", error);
  }
}

/**
 * Edits finished sessions only. The `endedAt: { not: null }` filter is part
 * of the update itself, so even a stop racing with this edit can never let
 * it rewrite a running session.
 */
export async function updateSleepSession(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const member = await requireMember();
  const parsed = schemas.updateSleepSessionSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  const { id, startedAt, endedAt, notes } = parsed.data;
  const scope = { id, baby: { householdId: member.householdId } };

  try {
    const { count } = await db.sleepSession.updateMany({
      where: { ...scope, endedAt: { not: null } },
      data: {
        startedAt,
        endedAt,
        notes: notes ?? null,
        updatedById: member.userId,
      },
    });
    if (count === 0) {
      const isRunning =
        (await db.sleepSession.count({ where: { ...scope, endedAt: null } })) >
        0;
      if (isRunning) {
        return actionError("CONFLICT", "Para la siesta antes de editarla.");
      }
      throw new NotFoundError();
    }

    revalidateSleep();
    return ok({ id });
  } catch (error) {
    return handleActionError("updateSleepSession", error);
  }
}

/** Idempotent; deleting a timer started by mistake frees the slot. */
export async function deleteSleepSession(
  input: unknown,
): Promise<ActionResult> {
  const member = await requireMember();
  const parsed = deleteSleepSessionSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  try {
    await db.sleepSession.deleteMany({
      where: {
        id: parsed.data.id,
        baby: { householdId: member.householdId },
      },
    });
    revalidateSleep();
    return ok();
  } catch (error) {
    return handleActionError("deleteSleepSession", error);
  }
}
