import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { insertOnce, isUuid } from "@/lib/records";
import { createFamily, createSleepSession } from "@/test/factories";

// Real tables, because the point is how PostgreSQL reports each unique index.

function insertDiaper(babyId: string, createdById: string, id: string) {
  return () =>
    db.diaperChange.create({
      data: { id, babyId, type: "WET", occurredAt: new Date(), createdById },
      select: { id: true },
    });
}

function findDiaper(id: string, householdId: string) {
  return () =>
    db.diaperChange.findFirst({
      where: { id, baby: { householdId } },
      select: { id: true },
    });
}

describe("insertOnce", () => {
  it("inserts a new record", async () => {
    const family = await createFamily();
    const id = randomUUID();

    await expect(
      insertOnce(
        insertDiaper(family.babyId, family.userId, id),
        findDiaper(id, family.householdId),
      ),
    ).resolves.toEqual({ id });
  });

  it("treats a retry with the same id as the same record", async () => {
    const family = await createFamily();
    const id = randomUUID();
    const insert = insertDiaper(family.babyId, family.userId, id);
    const find = findDiaper(id, family.householdId);

    const results = await Promise.all([
      insertOnce(insert, find),
      insertOnce(insert, find),
    ]);

    expect(results).toEqual([{ id }, { id }]);
    expect(await db.diaperChange.count({ where: { id } })).toBe(1);
  });

  it("reports another unique index as a conflict, not as success", async () => {
    const family = await createFamily();
    await createSleepSession(family.babyId, {
      createdById: family.userId,
      endedAt: null,
    });
    const id = randomUUID();

    await expect(
      insertOnce(
        () =>
          db.sleepSession.create({
            data: {
              id,
              babyId: family.babyId,
              startedAt: new Date(),
              createdById: family.userId,
            },
            select: { id: true },
          }),
        () =>
          db.sleepSession.findFirst({
            where: { id, baby: { householdId: family.householdId } },
            select: { id: true },
          }),
      ),
    ).resolves.toBeNull();
  });

  it("never returns another household's record that reuses the id", async () => {
    const theirs = await createFamily();
    const mine = await createFamily();
    const id = randomUUID();
    await insertDiaper(theirs.babyId, theirs.userId, id)();

    await expect(
      insertOnce(
        insertDiaper(mine.babyId, mine.userId, id),
        findDiaper(id, mine.householdId),
      ),
    ).resolves.toBeNull();
  });

  it("lets unexpected errors reach the action boundary", async () => {
    const failure = new Error("connection lost");

    await expect(
      insertOnce(
        () => Promise.reject(failure),
        () => Promise.resolve(null),
      ),
    ).rejects.toBe(failure);
  });
});

describe("isUuid", () => {
  it("tells ids apart from anything a URL could carry", () => {
    expect(isUuid(randomUUID())).toBe(true);
    expect(isUuid("5eed0000-0000-4000-8000-000000000001")).toBe(true);
    expect(isUuid("not-a-uuid")).toBe(false);
    expect(isUuid("")).toBe(false);
  });
});
