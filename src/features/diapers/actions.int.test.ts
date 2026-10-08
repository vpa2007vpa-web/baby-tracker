import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { describe, expect, it, vi } from "vitest";

import {
  createDiaperChange,
  deleteDiaperChange,
  updateDiaperChange,
} from "@/features/diapers/actions";
import { db } from "@/lib/db";
import {
  createFamily,
  createMember,
  createDiaperChange as insertDiaperChange,
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

describe("createDiaperChange", () => {
  it("records a one-tap diaper now, by the signed-in parent", async () => {
    const family = await signedInFamily();
    const id = randomUUID();

    const result = await createDiaperChange({
      id,
      babyId: family.babyId,
      type: "WET",
    });

    expect(result).toEqual({ ok: true, data: { id } });
    const diaper = await db.diaperChange.findUniqueOrThrow({ where: { id } });
    expect(diaper.createdById).toBe(family.userId);
    expect(Math.abs(diaper.occurredAt.getTime() - Date.now())).toBeLessThan(
      10_000,
    );
    expect(revalidatePath).toHaveBeenCalledWith("/");
    expect(revalidatePath).toHaveBeenCalledWith("/diapers");
  });

  it("stores the typed time in the household zone and the stool details", async () => {
    const family = await signedInFamily();
    const id = randomUUID();

    await createDiaperChange({
      id,
      babyId: family.babyId,
      type: "MIXED",
      occurredAt: "2026-10-01T09:30",
      stoolColor: "YELLOW",
    });

    await expect(
      db.diaperChange.findUniqueOrThrow({ where: { id } }),
    ).resolves.toMatchObject({
      occurredAt: new Date("2026-10-01T07:30:00Z"),
      type: "MIXED",
      stoolColor: "YELLOW",
      stoolConsistency: null,
    });
  });

  it("creates a single diaper on a double tap", async () => {
    const family = await signedInFamily();
    const input = { id: randomUUID(), babyId: family.babyId, type: "WET" };

    const results = await Promise.all([
      createDiaperChange(input),
      createDiaperChange(input),
    ]);

    expect(results).toEqual([
      { ok: true, data: { id: input.id } },
      { ok: true, data: { id: input.id } },
    ]);
    await expect(
      db.diaperChange.count({ where: { babyId: family.babyId } }),
    ).resolves.toBe(1);
  });

  it("refuses another household's baby as if it did not exist", async () => {
    const theirs = await createFamily();
    await signedInFamily();

    const result = await createDiaperChange({
      id: randomUUID(),
      babyId: theirs.babyId,
      type: "WET",
    });

    expect(result).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    await expect(
      db.diaperChange.count({ where: { babyId: theirs.babyId } }),
    ).resolves.toBe(0);
  });

  it("never answers with another household's record that reuses the id", async () => {
    const theirs = await createFamily();
    const { id } = await insertDiaperChange(theirs.babyId, {
      createdById: theirs.userId,
    });
    const mine = await signedInFamily();

    const result = await createDiaperChange({
      id,
      babyId: mine.babyId,
      type: "DIRTY",
    });

    expect(result).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    await expect(
      db.diaperChange.findUniqueOrThrow({ where: { id } }),
    ).resolves.toMatchObject({ babyId: theirs.babyId, type: "WET" });
  });

  it("returns field errors instead of writing", async () => {
    const family = await signedInFamily();

    const result = await createDiaperChange({
      id: randomUUID(),
      babyId: family.babyId,
      type: "WINDY",
    });

    expect(result).toMatchObject({
      ok: false,
      error: {
        code: "VALIDATION",
        fieldErrors: { type: ["Elige el tipo de pañal."] },
      },
    });
  });

  it("sends a user without a household to /join", async () => {
    session.userId = randomUUID();
    await expect(
      createDiaperChange({ id: randomUUID(), babyId: randomUUID() }),
    ).rejects.toThrow("REDIRECT:/join");
  });
});

describe("updateDiaperChange", () => {
  it("lets the other parent edit it and records who did", async () => {
    const family = await createFamily();
    const { id } = await insertDiaperChange(family.babyId, {
      createdById: family.userId,
    });
    await db.diaperChange.update({ where: { id }, data: { notes: "antes" } });
    const partner = await createMember(family.householdId, {
      role: "MEMBER",
      displayName: "Luis",
    });
    session.userId = partner.userId;

    const result = await updateDiaperChange({
      id,
      occurredAt: "2026-10-01T09:30",
      type: "DIRTY",
      stoolConsistency: "SOFT",
    });

    expect(result).toEqual({ ok: true, data: { id } });
    await expect(
      db.diaperChange.findUniqueOrThrow({ where: { id } }),
    ).resolves.toMatchObject({
      type: "DIRTY",
      stoolConsistency: "SOFT",
      // Emptied in the form, so cleared in the database.
      notes: null,
      createdById: family.userId,
      updatedById: partner.userId,
    });
  });

  it("answers NOT_FOUND for another household's diaper and leaves it as is", async () => {
    const theirs = await createFamily();
    const { id } = await insertDiaperChange(theirs.babyId, {
      createdById: theirs.userId,
    });
    await signedInFamily();

    const result = await updateDiaperChange({
      id,
      occurredAt: "2026-10-01T09:30",
      type: "DIRTY",
    });

    expect(result).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    await expect(
      db.diaperChange.findUniqueOrThrow({ where: { id } }),
    ).resolves.toMatchObject({ type: "WET", updatedById: null });
  });

  it("answers NOT_FOUND for a diaper that no longer exists", async () => {
    await signedInFamily();

    await expect(
      updateDiaperChange({
        id: randomUUID(),
        occurredAt: "2026-10-01T09:30",
        type: "WET",
      }),
    ).resolves.toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });
});

describe("deleteDiaperChange", () => {
  it("deletes it and answers ok again on a retry", async () => {
    const family = await signedInFamily();
    const { id } = await insertDiaperChange(family.babyId, {
      createdById: family.userId,
    });

    await expect(deleteDiaperChange({ id })).resolves.toEqual({
      ok: true,
      data: undefined,
    });
    await expect(deleteDiaperChange({ id })).resolves.toMatchObject({
      ok: true,
    });
    await expect(db.diaperChange.count({ where: { id } })).resolves.toBe(0);
  });

  it("never deletes another household's diaper", async () => {
    const theirs = await createFamily();
    const { id } = await insertDiaperChange(theirs.babyId, {
      createdById: theirs.userId,
    });
    await signedInFamily();

    await expect(deleteDiaperChange({ id })).resolves.toMatchObject({
      ok: true,
    });
    await expect(db.diaperChange.count({ where: { id } })).resolves.toBe(1);
  });
});
