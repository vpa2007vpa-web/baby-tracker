import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { describe, expect, it, vi } from "vitest";

import {
  createHealthRecord,
  deleteHealthRecord,
  updateHealthRecord,
} from "@/features/health/actions";
import { db } from "@/lib/db";
import {
  createFamily,
  createMember,
  createHealthRecord as insertHealthRecord,
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

function vaccineInput(babyId: string): Record<string, unknown> {
  return {
    id: randomUUID(),
    babyId,
    kind: "VACCINE",
    name: "Hexavalente",
    administeredAt: "2026-10-01T09:30",
    doseNumber: "2",
    reaction: "Febrícula",
  };
}

describe("createHealthRecord", () => {
  it("stores a vaccine with its series number and reaction", async () => {
    const family = await signedInFamily();
    const input = vaccineInput(family.babyId);

    const result = await createHealthRecord(input);

    expect(result).toEqual({ ok: true, data: { id: input.id } });
    await expect(
      db.healthRecord.findUniqueOrThrow({ where: { id: String(input.id) } }),
    ).resolves.toMatchObject({
      kind: "VACCINE",
      doseNumber: 2,
      reaction: "Febrícula",
      administeredAt: new Date("2026-10-01T07:30:00Z"),
      createdById: family.userId,
    });
    expect(revalidatePath).toHaveBeenCalledWith("/health");
  });

  it("stores a decimal dose exactly as typed", async () => {
    const family = await signedInFamily();
    const id = randomUUID();

    await createHealthRecord({
      id,
      babyId: family.babyId,
      kind: "MEDICATION",
      name: "Paracetamol",
      administeredAt: "2026-10-01T09:30",
      doseAmount: "2,5",
      doseUnit: "ML",
    });

    await expect(
      db.healthRecord.findUniqueOrThrow({ where: { id } }),
    ).resolves.toMatchObject({ doseAmount: 2.5, doseUnit: "ML" });
  });

  it("creates a single record on a double tap", async () => {
    const family = await signedInFamily();
    const input = vaccineInput(family.babyId);

    const results = await Promise.all([
      createHealthRecord(input),
      createHealthRecord(input),
    ]);

    expect(results.every((result) => result.ok)).toBe(true);
    await expect(
      db.healthRecord.count({ where: { babyId: family.babyId } }),
    ).resolves.toBe(1);
  });

  it("refuses another household's baby as if it did not exist", async () => {
    const theirs = await createFamily();
    await signedInFamily();

    await expect(
      createHealthRecord(vaccineInput(theirs.babyId)),
    ).resolves.toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    await expect(
      db.healthRecord.count({ where: { babyId: theirs.babyId } }),
    ).resolves.toBe(0);
  });
});

describe("updateHealthRecord", () => {
  it("replaces the fields, clearing the emptied ones, and records the editor", async () => {
    const family = await signedInFamily();
    const input = vaccineInput(family.babyId);
    await createHealthRecord(input);
    const partner = await createMember(family.householdId, {
      role: "MEMBER",
      displayName: "Luis",
    });
    session.userId = partner.userId;

    const result = await updateHealthRecord({
      id: input.id,
      kind: "VACCINE",
      name: "Hexavalente",
      administeredAt: "2026-10-01T10:00",
      doseNumber: "2",
    });

    expect(result).toEqual({ ok: true, data: { id: input.id } });
    await expect(
      db.healthRecord.findUniqueOrThrow({ where: { id: String(input.id) } }),
    ).resolves.toMatchObject({
      administeredAt: new Date("2026-10-01T08:00:00Z"),
      reaction: null,
      updatedById: partner.userId,
    });
  });

  it("answers NOT_FOUND for another household's record and leaves it as is", async () => {
    const theirs = await createFamily();
    const { id } = await insertHealthRecord(theirs.babyId, {
      createdById: theirs.userId,
    });
    await signedInFamily();

    await expect(
      updateHealthRecord({
        id,
        kind: "MEDICATION",
        name: "Otra cosa",
        administeredAt: "2026-10-01T10:00",
      }),
    ).resolves.toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    await expect(
      db.healthRecord.findUniqueOrThrow({ where: { id } }),
    ).resolves.toMatchObject({ name: "Vitamina D" });
  });
});

describe("deleteHealthRecord", () => {
  it("deletes it, answers ok on a retry and never touches another household", async () => {
    const family = await signedInFamily();
    const own = await insertHealthRecord(family.babyId, {
      createdById: family.userId,
    });
    const theirs = await createFamily();
    const foreign = await insertHealthRecord(theirs.babyId, {
      createdById: theirs.userId,
    });

    await expect(deleteHealthRecord({ id: own.id })).resolves.toMatchObject({
      ok: true,
    });
    await expect(deleteHealthRecord({ id: own.id })).resolves.toMatchObject({
      ok: true,
    });
    await expect(deleteHealthRecord({ id: foreign.id })).resolves.toMatchObject(
      { ok: true },
    );

    await expect(
      db.healthRecord.count({ where: { id: own.id } }),
    ).resolves.toBe(0);
    await expect(
      db.healthRecord.count({ where: { id: foreign.id } }),
    ).resolves.toBe(1);
  });
});
