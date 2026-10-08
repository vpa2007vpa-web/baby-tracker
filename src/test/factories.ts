import { randomUUID } from "node:crypto";

import { getInviteExpiry, hashInviteCode } from "@/features/household/service";
import type {
  BottleContent,
  DiaperType,
  FeedingType,
  HealthRecordKind,
  HouseholdRole,
} from "@/generated/prisma/client";
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

// ─── Baby records ────────────────────────────────────────────────────────────
// Defaults describe a plausible past record; pass `endedAt: null` for an
// active timer. `createdById` is required: every record has an author.

const MINUTE_MS = 60_000;

function minutesAgo(minutes: number): Date {
  return new Date(Date.now() - minutes * MINUTE_MS);
}

export async function createDiaperChange(
  babyId: string,
  input: {
    createdById: string;
    id?: string;
    type?: DiaperType;
    occurredAt?: Date;
  },
): Promise<{ id: string }> {
  return db.diaperChange.create({
    data: {
      id: input.id,
      babyId,
      type: input.type ?? "WET",
      occurredAt: input.occurredAt ?? minutesAgo(30),
      createdById: input.createdById,
    },
    select: { id: true },
  });
}

export async function createFeeding(
  babyId: string,
  input: {
    createdById: string;
    id?: string;
    type?: FeedingType;
    startedAt?: Date;
    endedAt?: Date | null;
    amountMl?: number;
    bottleContent?: BottleContent;
  },
): Promise<{ id: string }> {
  const type = input.type ?? "BREAST_LEFT";
  const isBottle = type === "BOTTLE";
  return db.feeding.create({
    data: {
      id: input.id,
      babyId,
      type,
      startedAt: input.startedAt ?? minutesAgo(60),
      // Bottles are point-in-time; breast feedings end unless told otherwise.
      endedAt: isBottle
        ? null
        : input.endedAt === undefined
          ? minutesAgo(45)
          : input.endedAt,
      amountMl: isBottle ? (input.amountMl ?? 90) : null,
      bottleContent: isBottle ? (input.bottleContent ?? "FORMULA") : null,
      createdById: input.createdById,
    },
    select: { id: true },
  });
}

export async function createSleepSession(
  babyId: string,
  input: {
    createdById: string;
    id?: string;
    startedAt?: Date;
    endedAt?: Date | null;
  },
): Promise<{ id: string }> {
  return db.sleepSession.create({
    data: {
      id: input.id,
      babyId,
      startedAt: input.startedAt ?? minutesAgo(120),
      endedAt: input.endedAt === undefined ? minutesAgo(60) : input.endedAt,
      createdById: input.createdById,
    },
    select: { id: true },
  });
}

export async function createGrowthMeasurement(
  babyId: string,
  input: { createdById: string; measuredAt?: Date; weightGrams?: number },
): Promise<{ id: string }> {
  return db.growthMeasurement.create({
    data: {
      babyId,
      measuredAt: input.measuredAt ?? minutesAgo(60),
      weightGrams: input.weightGrams ?? 4850,
      createdById: input.createdById,
    },
    select: { id: true },
  });
}

export async function createHealthRecord(
  babyId: string,
  input: {
    createdById: string;
    kind?: HealthRecordKind;
    name?: string;
    administeredAt?: Date;
  },
): Promise<{ id: string }> {
  return db.healthRecord.create({
    data: {
      babyId,
      kind: input.kind ?? "MEDICATION",
      name: input.name ?? "Vitamina D",
      administeredAt: input.administeredAt ?? minutesAgo(60),
      createdById: input.createdById,
    },
    select: { id: true },
  });
}
