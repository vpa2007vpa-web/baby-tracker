import { randomUUID } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import {
  createFeeding,
  deleteFeeding,
  startFeeding,
  stopFeeding,
  switchFeedingSide,
  updateFeeding,
} from "@/features/feeding/actions";
import { db } from "@/lib/db";
import {
  createFamily,
  createMember,
  createFeeding as insertFeeding,
} from "@/test/factories";
import { session } from "@/test/session-double";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/features/auth/session", () => import("@/test/session-double"));

type Family = {
  householdId: string;
  babyId: string;
  /** OWNER "Ana". */
  ana: string;
  /** MEMBER "Luis". */
  luis: string;
};

async function familyWithTwoParents(): Promise<Family> {
  const family = await createFamily();
  const partner = await createMember(family.householdId, {
    role: "MEMBER",
    displayName: "Luis",
  });
  session.userId = family.userId;
  return {
    householdId: family.householdId,
    babyId: family.babyId,
    ana: family.userId,
    luis: partner.userId,
  };
}

/** Calls `action` as `userId`; the session double reads it synchronously. */
function actingAs<T>(userId: string, action: () => Promise<T>): Promise<T> {
  session.userId = userId;
  return action();
}

function runningFeedings(babyId: string): Promise<number> {
  return db.feeding.count({
    where: { babyId, endedAt: null, type: { not: "BOTTLE" } },
  });
}

function runningLeftBreast(family: Family): Promise<{ id: string }> {
  return insertFeeding(family.babyId, {
    createdById: family.ana,
    type: "BREAST_LEFT",
    endedAt: null,
  });
}

describe("startFeeding", () => {
  it("starts the chosen breast on the server clock, by the signed-in parent", async () => {
    const family = await familyWithTwoParents();
    const id = randomUUID();

    const result = await startFeeding({
      id,
      babyId: family.babyId,
      type: "BREAST_RIGHT",
    });

    expect(result).toMatchObject({
      ok: true,
      data: { id, type: "BREAST_RIGHT", endedAt: null },
    });
    await expect(
      db.feeding.findUniqueOrThrow({ where: { id } }),
    ).resolves.toMatchObject({ createdById: family.ana });
  });

  it("starts a single feeding on a double tap", async () => {
    const family = await familyWithTwoParents();
    const input = {
      id: randomUUID(),
      babyId: family.babyId,
      type: "BREAST_LEFT",
    };

    const results = await Promise.all([
      startFeeding(input),
      startFeeding(input),
    ]);

    expect(results.map((result) => result.ok)).toEqual([true, true]);
    await expect(runningFeedings(family.babyId)).resolves.toBe(1);
  });

  it("lets only one of two parents starting at once win, and names the winner", async () => {
    const family = await familyWithTwoParents();

    const results = await Promise.all([
      actingAs(family.ana, () =>
        startFeeding({
          id: randomUUID(),
          babyId: family.babyId,
          type: "BREAST_LEFT",
        }),
      ),
      actingAs(family.luis, () =>
        startFeeding({
          id: randomUUID(),
          babyId: family.babyId,
          type: "BREAST_RIGHT",
        }),
      ),
    ]);

    await expect(runningFeedings(family.babyId)).resolves.toBe(1);
    const winner = await db.feeding.findFirstOrThrow({
      where: { babyId: family.babyId, endedAt: null },
    });
    const winnerName = winner.createdById === family.ana ? "Ana" : "Luis";
    expect(results.filter((result) => !result.ok)).toEqual([
      {
        ok: false,
        error: {
          code: "CONFLICT",
          message: `Ya hay una toma en curso, iniciada por ${winnerName}.`,
        },
      },
    ]);
  });

  it("never lets a bottle block a breast timer", async () => {
    const family = await familyWithTwoParents();
    await insertFeeding(family.babyId, {
      createdById: family.ana,
      type: "BOTTLE",
    });

    await expect(
      startFeeding({
        id: randomUUID(),
        babyId: family.babyId,
        type: "BREAST_LEFT",
      }),
    ).resolves.toMatchObject({ ok: true });
  });

  it("answers NOT_FOUND for another household's baby", async () => {
    const theirs = await createFamily();
    await familyWithTwoParents();

    await expect(
      startFeeding({
        id: randomUUID(),
        babyId: theirs.babyId,
        type: "BREAST_LEFT",
      }),
    ).resolves.toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });
});

describe("stopFeeding", () => {
  it("lets the other parent stop it and records them as the editor", async () => {
    const family = await familyWithTwoParents();
    const { id } = await runningLeftBreast(family);

    const result = await actingAs(family.luis, () => stopFeeding({ id }));

    expect(result).toMatchObject({
      ok: true,
      data: { id, wasAlreadyStopped: false },
    });
    await expect(
      db.feeding.findUniqueOrThrow({ where: { id } }),
    ).resolves.toMatchObject({ updatedById: family.luis });
    await expect(runningFeedings(family.babyId)).resolves.toBe(0);
  });

  it("ends it once when both parents stop it at the same time", async () => {
    const family = await familyWithTwoParents();
    const { id } = await runningLeftBreast(family);

    const results = await Promise.all([
      actingAs(family.ana, () => stopFeeding({ id })),
      actingAs(family.luis, () => stopFeeding({ id })),
    ]);

    const stored = await db.feeding.findUniqueOrThrow({ where: { id } });
    const endedAt = stored.endedAt?.toISOString();
    expect(results).toEqual(
      expect.arrayContaining([
        {
          ok: true,
          data: expect.objectContaining({ endedAt, wasAlreadyStopped: false }),
        },
        {
          ok: true,
          data: expect.objectContaining({ endedAt, wasAlreadyStopped: true }),
        },
      ]),
    );
  });

  it("answers NOT_FOUND for a bottle: it is not a timer", async () => {
    const family = await familyWithTwoParents();
    const { id } = await insertFeeding(family.babyId, {
      createdById: family.ana,
      type: "BOTTLE",
    });

    await expect(stopFeeding({ id })).resolves.toMatchObject({
      ok: false,
      error: { code: "NOT_FOUND" },
    });
  });
});

describe("switchFeedingSide", () => {
  it("stops the running breast and starts the other one at the same instant", async () => {
    const family = await familyWithTwoParents();
    const left = await runningLeftBreast(family);
    const id = randomUUID();

    const result = await actingAs(family.luis, () =>
      switchFeedingSide({ activeId: left.id, id }),
    );

    expect(result).toMatchObject({
      ok: true,
      data: { id, type: "BREAST_RIGHT", endedAt: null },
    });
    const stopped = await db.feeding.findUniqueOrThrow({
      where: { id: left.id },
    });
    const started = await db.feeding.findUniqueOrThrow({ where: { id } });
    expect(stopped.endedAt).toEqual(started.startedAt);
    expect(stopped.updatedById).toBe(family.luis);
    expect(started.createdById).toBe(family.luis);
    await expect(runningFeedings(family.babyId)).resolves.toBe(1);
  });

  it("switches once when the same switch is retried", async () => {
    const family = await familyWithTwoParents();
    const left = await runningLeftBreast(family);
    const input = { activeId: left.id, id: randomUUID() };

    const first = await switchFeedingSide(input);
    const retry = await switchFeedingSide(input);

    expect(retry).toEqual(first);
    await expect(
      db.feeding.count({ where: { babyId: family.babyId } }),
    ).resolves.toBe(2);
  });

  it("leaves exactly one running feeding when both parents switch at once", async () => {
    const family = await familyWithTwoParents();
    const left = await runningLeftBreast(family);

    const results = await Promise.all([
      actingAs(family.ana, () =>
        switchFeedingSide({ activeId: left.id, id: randomUUID() }),
      ),
      actingAs(family.luis, () =>
        switchFeedingSide({ activeId: left.id, id: randomUUID() }),
      ),
    ]);

    await expect(runningFeedings(family.babyId)).resolves.toBe(1);
    await expect(
      db.feeding.count({ where: { babyId: family.babyId } }),
    ).resolves.toBe(2);
    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(results.filter((result) => !result.ok)).toEqual([
      expect.objectContaining({
        error: expect.objectContaining({ code: "CONFLICT" }),
      }),
    ]);
  });

  it("rolls back the stop when the new feeding cannot start", async () => {
    const theirs = await createFamily();
    const takenId = (
      await insertFeeding(theirs.babyId, { createdById: theirs.userId })
    ).id;
    const family = await familyWithTwoParents();
    const left = await runningLeftBreast(family);

    const result = await switchFeedingSide({ activeId: left.id, id: takenId });

    expect(result).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    await expect(
      db.feeding.findUniqueOrThrow({ where: { id: left.id } }),
    ).resolves.toMatchObject({ endedAt: null, updatedById: null });
  });

  it("still starts the other breast when the other parent already stopped this one", async () => {
    const family = await familyWithTwoParents();
    const endedAt = new Date(Date.now() - 60_000);
    const left = await insertFeeding(family.babyId, {
      createdById: family.ana,
      type: "BREAST_LEFT",
      startedAt: new Date(Date.now() - 20 * 60_000),
      endedAt,
    });

    const result = await switchFeedingSide({
      activeId: left.id,
      id: randomUUID(),
    });

    expect(result).toMatchObject({ ok: true, data: { type: "BREAST_RIGHT" } });
    await expect(
      db.feeding.findUniqueOrThrow({ where: { id: left.id } }),
    ).resolves.toMatchObject({ endedAt });
  });

  it("answers NOT_FOUND for a bottle or another household's feeding", async () => {
    const theirs = await createFamily();
    const foreign = await insertFeeding(theirs.babyId, {
      createdById: theirs.userId,
      endedAt: null,
    });
    const family = await familyWithTwoParents();
    const bottle = await insertFeeding(family.babyId, {
      createdById: family.ana,
      type: "BOTTLE",
    });

    for (const activeId of [bottle.id, foreign.id]) {
      await expect(
        switchFeedingSide({ activeId, id: randomUUID() }),
      ).resolves.toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    }
    await expect(runningFeedings(family.babyId)).resolves.toBe(0);
    await expect(runningFeedings(theirs.babyId)).resolves.toBe(1);
  });
});

describe("createFeeding", () => {
  it("records a one-tap bottle now", async () => {
    const family = await familyWithTwoParents();
    const id = randomUUID();

    const result = await createFeeding({
      id,
      babyId: family.babyId,
      type: "BOTTLE",
      amountMl: 120,
      bottleContent: "BREAST_MILK",
    });

    expect(result).toEqual({ ok: true, data: { id } });
    const stored = await db.feeding.findUniqueOrThrow({ where: { id } });
    expect(stored).toMatchObject({
      amountMl: 120,
      bottleContent: "BREAST_MILK",
      endedAt: null,
      createdById: family.ana,
    });
    expect(Math.abs(stored.startedAt.getTime() - Date.now())).toBeLessThan(
      10_000,
    );
  });

  it("records a breast feeding typed by hand, even while a timer runs", async () => {
    const family = await familyWithTwoParents();
    await runningLeftBreast(family);
    const id = randomUUID();

    await createFeeding({
      id,
      babyId: family.babyId,
      type: "BREAST_RIGHT",
      startedAt: "2026-10-01T09:00",
      endedAt: "2026-10-01T09:20",
    });

    await expect(
      db.feeding.findUniqueOrThrow({ where: { id } }),
    ).resolves.toMatchObject({
      startedAt: new Date("2026-10-01T07:00:00Z"),
      endedAt: new Date("2026-10-01T07:20:00Z"),
      amountMl: null,
    });
  });

  it("creates a single feeding on a double tap", async () => {
    const family = await familyWithTwoParents();
    const input = {
      id: randomUUID(),
      babyId: family.babyId,
      type: "BOTTLE",
      amountMl: "90",
      bottleContent: "FORMULA",
    };

    await Promise.all([createFeeding(input), createFeeding(input)]);

    await expect(
      db.feeding.count({ where: { babyId: family.babyId } }),
    ).resolves.toBe(1);
  });

  it("refuses another household's baby as if it did not exist", async () => {
    const theirs = await createFamily();
    await familyWithTwoParents();

    await expect(
      createFeeding({
        id: randomUUID(),
        babyId: theirs.babyId,
        type: "BOTTLE",
        amountMl: 90,
        bottleContent: "FORMULA",
      }),
    ).resolves.toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });
});

describe("updateFeeding", () => {
  it("edits a bottle and records the editor", async () => {
    const family = await familyWithTwoParents();
    const { id } = await insertFeeding(family.babyId, {
      createdById: family.ana,
      type: "BOTTLE",
    });

    const result = await actingAs(family.luis, () =>
      updateFeeding({
        id,
        type: "BOTTLE",
        startedAt: "2026-10-01T09:00",
        amountMl: "150",
        bottleContent: "BREAST_MILK",
      }),
    );

    expect(result).toEqual({ ok: true, data: { id } });
    await expect(
      db.feeding.findUniqueOrThrow({ where: { id } }),
    ).resolves.toMatchObject({
      amountMl: 150,
      bottleContent: "BREAST_MILK",
      updatedById: family.luis,
    });
  });

  it("turns a finished breast feeding into a bottle, clearing what no longer applies", async () => {
    const family = await familyWithTwoParents();
    const { id } = await insertFeeding(family.babyId, {
      createdById: family.ana,
    });

    await updateFeeding({
      id,
      type: "BOTTLE",
      startedAt: "2026-10-01T09:00",
      amountMl: 90,
      bottleContent: "FORMULA",
    });

    await expect(
      db.feeding.findUniqueOrThrow({ where: { id } }),
    ).resolves.toMatchObject({ type: "BOTTLE", endedAt: null, amountMl: 90 });
  });

  it("refuses to touch a running feeding: it can only be stopped", async () => {
    const family = await familyWithTwoParents();
    const { id } = await runningLeftBreast(family);

    await expect(
      updateFeeding({
        id,
        type: "BREAST_LEFT",
        startedAt: "2026-10-01T09:00",
        endedAt: "2026-10-01T09:20",
      }),
    ).resolves.toEqual({
      ok: false,
      error: { code: "CONFLICT", message: "Para la toma antes de editarla." },
    });
    await expect(runningFeedings(family.babyId)).resolves.toBe(1);
  });

  it("answers NOT_FOUND for another household's feeding", async () => {
    const theirs = await createFamily();
    const { id } = await insertFeeding(theirs.babyId, {
      createdById: theirs.userId,
      type: "BOTTLE",
    });
    await familyWithTwoParents();

    await expect(
      updateFeeding({
        id,
        type: "BOTTLE",
        startedAt: "2026-10-01T09:00",
        amountMl: 90,
        bottleContent: "FORMULA",
      }),
    ).resolves.toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });
});

describe("deleteFeeding", () => {
  it("deletes it, answers ok on a retry and never touches another household", async () => {
    const family = await familyWithTwoParents();
    const own = await runningLeftBreast(family);
    const theirs = await createFamily();
    const foreign = await insertFeeding(theirs.babyId, {
      createdById: theirs.userId,
    });

    await expect(deleteFeeding({ id: own.id })).resolves.toMatchObject({
      ok: true,
    });
    await expect(deleteFeeding({ id: own.id })).resolves.toMatchObject({
      ok: true,
    });
    await expect(deleteFeeding({ id: foreign.id })).resolves.toMatchObject({
      ok: true,
    });

    await expect(db.feeding.count({ where: { id: own.id } })).resolves.toBe(0);
    await expect(db.feeding.count({ where: { id: foreign.id } })).resolves.toBe(
      1,
    );
  });
});
