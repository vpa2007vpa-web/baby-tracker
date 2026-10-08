"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getMemberByUserId } from "@/features/auth/queries";
import { requireMember, requireUserId } from "@/features/auth/session";
import { formatInviteCode } from "@/features/household/invite-code";
import {
  createHouseholdSchema,
  joinHouseholdSchema,
} from "@/features/household/schemas";
import {
  generateInviteCode,
  getInviteExpiry,
  hashInviteCode,
  MAX_HOUSEHOLD_MEMBERS,
} from "@/features/household/service";
import type { Prisma } from "@/generated/prisma/client";
import {
  actionError,
  type ActionResult,
  handleActionError,
  ok,
  readPrismaCode,
  validationError,
} from "@/lib/action-result";
import { parseDateOnly } from "@/lib/dates";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

const INVALID_CODE_MESSAGE =
  "Ese código no vale o ha caducado. Pide uno nuevo.";
const FULL_HOUSEHOLD_MESSAGE = "Esta familia ya está completa.";

/** Thrown inside the join transaction so the claimed invite rolls back too. */
class HouseholdFullError extends Error {}

/** Serializes invite creation and redemption per household (ADR-043). */
async function lockHousehold(
  tx: Prisma.TransactionClient,
  householdId: string,
): Promise<void> {
  await tx.$queryRaw`SELECT id FROM public.households WHERE id = ${householdId}::uuid FOR UPDATE`;
}

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
    // If this lookup fails as well (database down), report the original
    // error through the boundary instead of letting the action throw.
    const existing = await getMemberByUserId(userId).catch(() => null);
    if (!existing) return handleActionError("createHousehold", error);
  }

  revalidatePath("/");
  redirect("/");
}

/**
 * New single-use invite for the caller's household, valid 24 h. The code is
 * returned once (formatted ABCDE-FGHJK) and only its hash is stored; any
 * other pending invite of the household is revoked.
 */
export async function createHouseholdInvite(): Promise<
  ActionResult<{ code: string; expiresAt: string }>
> {
  const member = await requireMember();

  try {
    const invite = await db.$transaction(async (tx) => {
      await lockHousehold(tx, member.householdId);
      const members = await tx.householdMember.count({
        where: { householdId: member.householdId },
      });
      if (members >= MAX_HOUSEHOLD_MEMBERS) return null;

      await tx.householdInvite.deleteMany({
        where: { householdId: member.householdId, usedAt: null },
      });
      const code = generateInviteCode();
      const expiresAt = getInviteExpiry(new Date());
      await tx.householdInvite.create({
        data: {
          householdId: member.householdId,
          codeHash: hashInviteCode(code),
          expiresAt,
          createdById: member.userId,
        },
        select: { id: true },
      });
      return {
        code: formatInviteCode(code),
        expiresAt: expiresAt.toISOString(),
      };
    });

    if (!invite) return actionError("CONFLICT", FULL_HOUSEHOLD_MESSAGE);
    // Literal paths: /settings has no layout.tsx for a "layout" revalidation.
    revalidatePath("/settings");
    revalidatePath("/settings/invite");
    return ok(invite);
  } catch (error) {
    return handleActionError("createHouseholdInvite", error);
  }
}

/**
 * Redeems an invite atomically: under the household row lock the invite is
 * claimed (only if still unused) and the member is created, or nothing is.
 * Unknown, expired and used codes get the same answer. On success it
 * redirects home.
 */
export async function joinHousehold(input: unknown): Promise<ActionResult> {
  const userId = await requireUserId();
  const parsed = joinHouseholdSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const isJoined = await db.$transaction(async (tx) => {
      const now = new Date();
      const invite = await tx.householdInvite.findFirst({
        where: {
          codeHash: hashInviteCode(parsed.data.code),
          usedAt: null,
          expiresAt: { gt: now },
        },
        select: { id: true, householdId: true },
      });
      if (!invite) return false;

      await lockHousehold(tx, invite.householdId);
      // Re-checked under the lock: a concurrent redemption may have won.
      const claim = await tx.householdInvite.updateMany({
        where: { id: invite.id, usedAt: null },
        data: { usedAt: now, usedById: userId },
      });
      if (claim.count === 0) return false;

      const members = await tx.householdMember.count({
        where: { householdId: invite.householdId },
      });
      if (members >= MAX_HOUSEHOLD_MEMBERS) throw new HouseholdFullError();

      await tx.householdMember.create({
        data: {
          householdId: invite.householdId,
          userId,
          role: "MEMBER",
          displayName: parsed.data.displayName,
        },
        select: { id: true },
      });
      return true;
    });

    if (!isJoined) {
      return actionError("VALIDATION", INVALID_CODE_MESSAGE, {
        code: [INVALID_CODE_MESSAGE],
      });
    }
  } catch (error) {
    if (error instanceof HouseholdFullError) {
      return actionError("CONFLICT", FULL_HOUSEHOLD_MESSAGE);
    }
    // userId is unique: the caller already belongs to a household. The
    // transaction rolled back, so the invite stays usable.
    if (readPrismaCode(error) === "P2002") {
      return actionError("CONFLICT", "Ya perteneces a una familia.");
    }
    return handleActionError("joinHousehold", error);
  }

  revalidatePath("/");
  redirect("/");
}
