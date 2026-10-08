import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { describe, expect, it, vi } from "vitest";

import {
  createGrowthMeasurement,
  deleteGrowthMeasurement,
  updateGrowthMeasurement,
} from "@/features/growth/actions";
import { db } from "@/lib/db";
import {
  createFamily,
  createMember,
  createGrowthMeasurement as insertGrowthMeasurement,
} from "@/test/factories";
import { session } from "@/test/session-double";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/features/auth/session", () => import("@/test/session-double"));

async function signedInFamily(): Promise<{
  householdId: string;
  userId: string;
  babyId: string;
}> {
  const family = await createFamily();
  session.userId = family.userId;
  return family;
}

describe("createGrowthMeasurement", () => {
  it("stores the kg and cm typed by the parent as g and mm", async () => {
    const family = await signedInFamily();
    const id = randomUUID();

    const result = await createGrowthMeasurement({
      id,
      babyId: family.babyId,
      measuredAt: "2026-10-01T09:30",
      weightKg: "4,85",
      headCircumferenceCm: "38",
    });

    expect(result).toEqual({ ok: true, data: { id } });
    await expect(
      db.growthMeasurement.findUniqueOrThrow({ where: { id } }),
    ).resolves.toMatchObject({
      measuredAt: new Date("2026-10-01T07:30:00Z"),
      weightGrams: 4850,
      lengthMm: null,
      headCircumferenceMm: 380,
      createdById: family.userId,
    });
    expect(revalidatePath).toHaveBeenCalledWith("/growth");
  });

  it("creates a single measurement on a double tap", async () => {
    const family = await signedInFamily();
    const input = {
      id: randomUUID(),
      babyId: family.babyId,
      measuredAt: "2026-10-01T09:30",
      weightKg: "5",
    };

    const results = await Promise.all([
      createGrowthMeasurement(input),
      createGrowthMeasurement(input),
    ]);

    expect(results.every((result) => result.ok)).toBe(true);
    await expect(
      db.growthMeasurement.count({ where: { babyId: family.babyId } }),
    ).resolves.toBe(1);
  });

  it("refuses another household's baby as if it did not exist", async () => {
    const theirs = await createFamily();
    await signedInFamily();

    await expect(
      createGrowthMeasurement({
        id: randomUUID(),
        babyId: theirs.babyId,
        measuredAt: "2026-10-01T09:30",
        weightKg: "5",
      }),
    ).resolves.toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    await expect(
      db.growthMeasurement.count({ where: { babyId: theirs.babyId } }),
    ).resolves.toBe(0);
  });

  it("asks for a measure instead of writing an empty row", async () => {
    const family = await signedInFamily();

    await expect(
      createGrowthMeasurement({
        id: randomUUID(),
        babyId: family.babyId,
        measuredAt: "2026-10-01T09:30",
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: {
        code: "VALIDATION",
        fieldErrors: { weightKg: ["Indica al menos una medida."] },
      },
    });
  });
});

describe("updateGrowthMeasurement", () => {
  it("replaces the measures, clearing the emptied ones, and records the editor", async () => {
    const family = await createFamily();
    const { id } = await insertGrowthMeasurement(family.babyId, {
      createdById: family.userId,
      weightGrams: 4850,
    });
    const partner = await createMember(family.householdId, {
      role: "MEMBER",
      displayName: "Luis",
    });
    session.userId = partner.userId;

    const result = await updateGrowthMeasurement({
      id,
      measuredAt: "2026-10-01T09:30",
      weightKg: "",
      lengthCm: "56,5",
    });

    expect(result).toEqual({ ok: true, data: { id } });
    await expect(
      db.growthMeasurement.findUniqueOrThrow({ where: { id } }),
    ).resolves.toMatchObject({
      weightGrams: null,
      lengthMm: 565,
      updatedById: partner.userId,
    });
  });

  it("answers NOT_FOUND for another household's measurement and leaves it as is", async () => {
    const theirs = await createFamily();
    const { id } = await insertGrowthMeasurement(theirs.babyId, {
      createdById: theirs.userId,
      weightGrams: 4850,
    });
    await signedInFamily();

    await expect(
      updateGrowthMeasurement({
        id,
        measuredAt: "2026-10-01T09:30",
        weightKg: "9",
      }),
    ).resolves.toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    await expect(
      db.growthMeasurement.findUniqueOrThrow({ where: { id } }),
    ).resolves.toMatchObject({ weightGrams: 4850 });
  });
});

describe("deleteGrowthMeasurement", () => {
  it("deletes it, answers ok on a retry and never touches another household", async () => {
    const family = await signedInFamily();
    const own = await insertGrowthMeasurement(family.babyId, {
      createdById: family.userId,
    });
    const theirs = await createFamily();
    const foreign = await insertGrowthMeasurement(theirs.babyId, {
      createdById: theirs.userId,
    });

    await expect(
      deleteGrowthMeasurement({ id: own.id }),
    ).resolves.toMatchObject({ ok: true });
    await expect(
      deleteGrowthMeasurement({ id: own.id }),
    ).resolves.toMatchObject({ ok: true });
    await expect(
      deleteGrowthMeasurement({ id: foreign.id }),
    ).resolves.toMatchObject({ ok: true });

    await expect(
      db.growthMeasurement.count({ where: { id: own.id } }),
    ).resolves.toBe(0);
    await expect(
      db.growthMeasurement.count({ where: { id: foreign.id } }),
    ).resolves.toBe(1);
  });
});
