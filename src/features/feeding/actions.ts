"use server";

import { revalidatePath } from "next/cache";

import { assertBabyInHousehold } from "@/features/auth/authorization";
import { getMemberDisplayName } from "@/features/auth/queries";
import { type Member, requireMember } from "@/features/auth/session";
import { getActiveFeeding } from "@/features/feeding/queries";
import {
  deleteFeedingSchema,
  feedingSchemas,
  stopFeedingSchema,
  switchFeedingSideSchema,
} from "@/features/feeding/schemas";
import { getOppositeBreast } from "@/features/feeding/service";
import type { FeedingType, Prisma } from "@/generated/prisma/client";
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

// Breast feedings are timers (CLAUDE.md §2.4, §2.6): the running one lives in
// the database (endedAt = null), so both parents see it and either can stop
// or switch it. PostgreSQL enforces one running breast feeding per baby with
// a partial unique index; these actions only translate its answers. Bottles
// are points in time and never run.

const schemas = feedingSchemas(env.APP_TIMEZONE);

const BREAST = { type: { not: "BOTTLE" } } satisfies Prisma.FeedingWhereInput;

const TIMER_SELECT = {
  id: true,
  type: true,
  startedAt: true,
  endedAt: true,
} satisfies Prisma.FeedingSelect;

export type FeedingTimerState = {
  id: string;
  type: FeedingType;
  startedAt: string;
  endedAt: string | null;
};

function toTimerState(feeding: {
  id: string;
  type: FeedingType;
  startedAt: Date;
  endedAt: Date | null;
}): FeedingTimerState {
  return {
    id: feeding.id,
    type: feeding.type,
    startedAt: feeding.startedAt.toISOString(),
    endedAt: feeding.endedAt?.toISOString() ?? null,
  };
}

function revalidateFeeding(): void {
  revalidatePath("/");
  revalidatePath("/feeding");
}

function householdScope(member: Member): Prisma.FeedingWhereInput {
  return { baby: { householdId: member.householdId } };
}

/** "Ya hay una toma en curso, iniciada por Ana" (or "por ti"). */
async function runningFeedingConflict(
  babyId: string,
  member: Member,
): Promise<ActionResult<never>> {
  const running = await getActiveFeeding(babyId);
  // Stopped in the meantime by the other parent: a retry will succeed.
  if (!running) {
    return actionError(
      "CONFLICT",
      "No se ha podido iniciar la toma. Inténtalo de nuevo.",
    );
  }
  const author =
    running.createdById === member.userId
      ? "ti"
      : await getMemberDisplayName(running.createdById, member.householdId);
  return actionError(
    "CONFLICT",
    author
      ? `Ya hay una toma en curso, iniciada por ${author}.`
      : "Ya hay una toma en curso.",
  );
}

async function isIdTaken(id: string): Promise<boolean> {
  return (await db.feeding.count({ where: { id } })) > 0;
}

export async function startFeeding(
  input: unknown,
): Promise<ActionResult<FeedingTimerState>> {
  const member = await requireMember();
  const parsed = schemas.startFeedingSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  const { id, babyId, type } = parsed.data;
  const now = new Date();
  // A start a few minutes ahead (phone clock drift, tolerated by the schema)
  // is clamped, so stopping right away never ends before it began.
  const startedAt =
    parsed.data.startedAt && parsed.data.startedAt < now
      ? parsed.data.startedAt
      : now;

  try {
    await assertBabyInHousehold(babyId, member.householdId);
    const feeding = await insertOnce(
      () =>
        db.feeding.create({
          data: { id, babyId, type, startedAt, createdById: member.userId },
          select: TIMER_SELECT,
        }),
      () =>
        db.feeding.findFirst({
          where: { id, ...householdScope(member) },
          select: TIMER_SELECT,
        }),
    );
    if (!feeding) {
      // Either another household's id, or the partial unique index refused
      // a second running breast feeding.
      if (await isIdTaken(id)) throw new NotFoundError();
      return await runningFeedingConflict(babyId, member);
    }

    revalidateFeeding();
    return ok(toTimerState(feeding));
  } catch (error) {
    return handleActionError("startFeeding", error);
  }
}

/**
 * Idempotent stop on the server clock. When the update matches nothing, the
 * other parent (or a retry) already stopped it: that is a success too, and
 * the stored end time is returned unchanged.
 */
export async function stopFeeding(
  input: unknown,
): Promise<ActionResult<FeedingTimerState & { wasAlreadyStopped: boolean }>> {
  const member = await requireMember();
  const parsed = stopFeedingSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  const scope = { id: parsed.data.id, ...householdScope(member), ...BREAST };

  try {
    const { count } = await db.feeding.updateMany({
      where: { ...scope, endedAt: null },
      data: { endedAt: new Date(), updatedById: member.userId },
    });
    const feeding = await db.feeding.findFirst({
      where: scope,
      select: TIMER_SELECT,
    });
    // Missing, foreign, or a bottle: none of them is a timer.
    if (!feeding) throw new NotFoundError();

    revalidateFeeding();
    return ok({ ...toTimerState(feeding), wasAlreadyStopped: count === 0 });
  } catch (error) {
    return handleActionError("stopFeeding", error);
  }
}

/**
 * "Cambiar de pecho": stops `activeId` and starts the other breast as `id`
 * at the same instant, in one transaction (CLAUDE.md §2.3). If the new
 * feeding cannot be inserted (another one is running, or the id is taken),
 * PostgreSQL rolls the stop back too: never a half switch. A retry with the
 * same ids answers with the feeding it already started. If the other parent
 * stopped `activeId` meanwhile, the other breast still starts.
 */
export async function switchFeedingSide(
  input: unknown,
): Promise<ActionResult<FeedingTimerState>> {
  const member = await requireMember();
  const parsed = switchFeedingSideSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  const { activeId, id } = parsed.data;
  const household = householdScope(member);

  try {
    const now = new Date();
    const started = await insertOnce(
      () =>
        db.$transaction(async (tx) => {
          const previous = await tx.feeding.findFirst({
            where: { id: activeId, ...household, ...BREAST },
            select: { babyId: true, type: true },
          });
          // Bottles are excluded by the query; the check narrows the type.
          if (!previous || previous.type === "BOTTLE") {
            throw new NotFoundError();
          }
          await tx.feeding.updateMany({
            where: { id: activeId, endedAt: null },
            data: { endedAt: now, updatedById: member.userId },
          });
          return tx.feeding.create({
            data: {
              id,
              babyId: previous.babyId,
              type: getOppositeBreast(previous.type),
              startedAt: now,
              createdById: member.userId,
            },
            select: TIMER_SELECT,
          });
        }),
      () =>
        db.feeding.findFirst({
          where: { id, ...household, ...BREAST },
          select: TIMER_SELECT,
        }),
    );
    if (!started) {
      if (await isIdTaken(id)) throw new NotFoundError();
      const previous = await db.feeding.findFirst({
        where: { id: activeId, ...household },
        select: { babyId: true },
      });
      if (!previous) throw new NotFoundError();
      return await runningFeedingConflict(previous.babyId, member);
    }

    revalidateFeeding();
    return ok(toTimerState(started));
  } catch (error) {
    return handleActionError("switchFeedingSide", error);
  }
}

/**
 * A bottle (one tap: no time means now) or a finished breast feeding typed
 * by hand. Neither is a running timer, so neither competes with one.
 */
export async function createFeeding(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const member = await requireMember();
  const parsed = schemas.createFeedingSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  const feeding = parsed.data;
  const details =
    feeding.type === "BOTTLE"
      ? {
          type: feeding.type,
          startedAt: feeding.startedAt ?? new Date(),
          amountMl: feeding.amountMl,
          bottleContent: feeding.bottleContent,
        }
      : {
          type: feeding.type,
          startedAt: feeding.startedAt,
          endedAt: feeding.endedAt,
        };

  try {
    await assertBabyInHousehold(feeding.babyId, member.householdId);
    const created = await insertOnce(
      () =>
        db.feeding.create({
          data: {
            id: feeding.id,
            babyId: feeding.babyId,
            ...details,
            notes: feeding.notes,
            createdById: member.userId,
          },
          select: { id: true },
        }),
      () =>
        db.feeding.findFirst({
          where: { id: feeding.id, ...householdScope(member) },
          select: { id: true },
        }),
    );
    // Not a running timer, so outside the partial index: the id is foreign.
    if (!created) throw new NotFoundError();

    revalidateFeeding();
    return ok(created);
  } catch (error) {
    return handleActionError("createFeeding", error);
  }
}

/**
 * Edits bottles and finished breast feedings; the type may change, and the
 * fields of the old type are cleared. The "not running" condition is part
 * of the update itself, so a racing stop can never let it rewrite a running
 * feeding.
 */
export async function updateFeeding(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const member = await requireMember();
  const parsed = schemas.updateFeedingSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  const feeding = parsed.data;
  const scope = { id: feeding.id, ...householdScope(member) };
  const details =
    feeding.type === "BOTTLE"
      ? {
          type: feeding.type,
          startedAt: feeding.startedAt,
          endedAt: null,
          amountMl: feeding.amountMl,
          bottleContent: feeding.bottleContent,
        }
      : {
          type: feeding.type,
          startedAt: feeding.startedAt,
          endedAt: feeding.endedAt,
          amountMl: null,
          bottleContent: null,
        };

  try {
    const { count } = await db.feeding.updateMany({
      where: {
        ...scope,
        OR: [{ type: "BOTTLE" }, { endedAt: { not: null } }],
      },
      data: {
        ...details,
        notes: feeding.notes ?? null,
        updatedById: member.userId,
      },
    });
    if (count === 0) {
      const isRunning =
        (await db.feeding.count({
          where: { ...scope, ...BREAST, endedAt: null },
        })) > 0;
      if (isRunning) {
        return actionError("CONFLICT", "Para la toma antes de editarla.");
      }
      throw new NotFoundError();
    }

    revalidateFeeding();
    return ok({ id: feeding.id });
  } catch (error) {
    return handleActionError("updateFeeding", error);
  }
}

/** Idempotent; deleting a timer started by mistake frees the slot. */
export async function deleteFeeding(input: unknown): Promise<ActionResult> {
  const member = await requireMember();
  const parsed = deleteFeedingSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  try {
    await db.feeding.deleteMany({
      where: { id: parsed.data.id, ...householdScope(member) },
    });
    revalidateFeeding();
    return ok();
  } catch (error) {
    return handleActionError("deleteFeeding", error);
  }
}
