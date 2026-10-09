import { randomUUID } from "node:crypto";

import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";
import { describe, expect, it, vi } from "vitest";

import {
  createSleepSession,
  deleteSleepSession,
  startSleepSession,
  stopSleepSession,
  updateSleepSession,
} from "@/features/sleep/actions";
import { db } from "@/lib/db";
import {
  createFamily,
  createMember,
  createSleepSession as insertSleepSession,
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

function runningSessions(babyId: string): Promise<number> {
  return db.sleepSession.count({ where: { babyId, endedAt: null } });
}

describe("startSleepSession", () => {
  it("starts on the server clock, by the signed-in parent", async () => {
    const family = await familyWithTwoParents();
    const id = randomUUID();
    const before = Date.now();

    const result = await startSleepSession({ id, babyId: family.babyId });

    expect(result).toMatchObject({ ok: true, data: { id, endedAt: null } });
    const stored = await db.sleepSession.findUniqueOrThrow({ where: { id } });
    expect(stored.createdById).toBe(family.ana);
    expect(stored.startedAt.getTime()).toBeGreaterThanOrEqual(before - 1000);
  });

  it("clamps a start a few minutes ahead, so it never ends before it began", async () => {
    const family = await familyWithTwoParents();
    const id = randomUUID();
    const aheadByPhoneClock = format(
      new TZDate(Date.now() + 3 * 60_000, "Europe/Madrid"),
      "yyyy-MM-dd'T'HH:mm",
    );

    await startSleepSession({
      id,
      babyId: family.babyId,
      startedAt: aheadByPhoneClock,
    });
    const stopped = await stopSleepSession({ id });

    expect(stopped.ok).toBe(true);
    const stored = await db.sleepSession.findUniqueOrThrow({ where: { id } });
    expect(stored.startedAt.getTime()).toBeLessThanOrEqual(Date.now());
  });

  it("goes back the minutes asked on the server clock", async () => {
    const family = await familyWithTwoParents();
    const id = randomUUID();
    const before = Date.now();

    await startSleepSession({ id, babyId: family.babyId, minutesAgo: 15 });

    const after = Date.now();
    const stored = await db.sleepSession.findUniqueOrThrow({ where: { id } });
    // Exact to the server's millisecond: no minute rounding, no phone clock.
    expect(stored.startedAt.getTime()).toBeGreaterThanOrEqual(
      before - 15 * 60_000,
    );
    expect(stored.startedAt.getTime()).toBeLessThanOrEqual(after - 15 * 60_000);
  });

  it("never starts before the previous sleep ended", async () => {
    const family = await familyWithTwoParents();
    const previousEnd = new Date(Date.now() - 4 * 60_000);
    await insertSleepSession(family.babyId, {
      createdById: family.luis,
      startedAt: new Date(Date.now() - 90 * 60_000),
      endedAt: previousEnd,
    });
    const id = randomUUID();

    await startSleepSession({ id, babyId: family.babyId, minutesAgo: 15 });

    const stored = await db.sleepSession.findUniqueOrThrow({ where: { id } });
    expect(stored.startedAt).toEqual(previousEnd);
  });

  it("ignores another baby's sleeps when going back", async () => {
    const family = await familyWithTwoParents();
    const other = await createFamily();
    await insertSleepSession(other.babyId, {
      createdById: other.userId,
      endedAt: new Date(Date.now() - 2 * 60_000),
    });
    const id = randomUUID();
    const before = Date.now();

    await startSleepSession({ id, babyId: family.babyId, minutesAgo: 10 });

    const stored = await db.sleepSession.findUniqueOrThrow({ where: { id } });
    expect(stored.startedAt.getTime()).toBeLessThanOrEqual(before - 9 * 60_000);
  });

  it("starts a single session on a double tap", async () => {
    const family = await familyWithTwoParents();
    const input = { id: randomUUID(), babyId: family.babyId };

    const results = await Promise.all([
      startSleepSession(input),
      startSleepSession(input),
    ]);

    expect(results.map((result) => result.ok)).toEqual([true, true]);
    await expect(runningSessions(family.babyId)).resolves.toBe(1);
  });

  it("lets only one of two parents starting at once win, and names the winner", async () => {
    const family = await familyWithTwoParents();

    const results = await Promise.all([
      actingAs(family.ana, () =>
        startSleepSession({ id: randomUUID(), babyId: family.babyId }),
      ),
      actingAs(family.luis, () =>
        startSleepSession({ id: randomUUID(), babyId: family.babyId }),
      ),
    ]);

    await expect(runningSessions(family.babyId)).resolves.toBe(1);
    const winner = await db.sleepSession.findFirstOrThrow({
      where: { babyId: family.babyId, endedAt: null },
    });
    const winnerName = winner.createdById === family.ana ? "Ana" : "Luis";
    const conflicts = results.filter((result) => !result.ok);
    expect(conflicts).toEqual([
      {
        ok: false,
        error: {
          code: "CONFLICT",
          message: `Ya hay una siesta en curso, iniciada por ${winnerName}.`,
        },
      },
    ]);
  });

  it("tells a parent when the running session is their own", async () => {
    const family = await familyWithTwoParents();
    await insertSleepSession(family.babyId, {
      createdById: family.ana,
      endedAt: null,
    });

    await expect(
      startSleepSession({ id: randomUUID(), babyId: family.babyId }),
    ).resolves.toMatchObject({
      error: { message: "Ya hay una siesta en curso, iniciada por ti." },
    });
  });

  it("answers NOT_FOUND for another household's baby or id", async () => {
    const theirs = await createFamily();
    const foreign = await insertSleepSession(theirs.babyId, {
      createdById: theirs.userId,
    });
    const family = await familyWithTwoParents();

    await expect(
      startSleepSession({ id: randomUUID(), babyId: theirs.babyId }),
    ).resolves.toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    await expect(
      startSleepSession({ id: foreign.id, babyId: family.babyId }),
    ).resolves.toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    await expect(runningSessions(family.babyId)).resolves.toBe(0);
  });
});

describe("stopSleepSession", () => {
  it("lets the other parent stop it and records them as the editor", async () => {
    const family = await familyWithTwoParents();
    const { id } = await insertSleepSession(family.babyId, {
      createdById: family.ana,
      endedAt: null,
    });

    const result = await actingAs(family.luis, () => stopSleepSession({ id }));

    expect(result).toMatchObject({
      ok: true,
      data: { id, wasAlreadyStopped: false },
    });
    const stored = await db.sleepSession.findUniqueOrThrow({ where: { id } });
    expect(stored.endedAt).not.toBeNull();
    expect(stored.updatedById).toBe(family.luis);
  });

  it("ends it once when both parents stop it at the same time", async () => {
    const family = await familyWithTwoParents();
    const { id } = await insertSleepSession(family.babyId, {
      createdById: family.ana,
      endedAt: null,
    });

    const results = await Promise.all([
      actingAs(family.ana, () => stopSleepSession({ id })),
      actingAs(family.luis, () => stopSleepSession({ id })),
    ]);

    const stored = await db.sleepSession.findUniqueOrThrow({ where: { id } });
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

  it("keeps the original end time when it was already stopped", async () => {
    const family = await familyWithTwoParents();
    const endedAt = new Date("2026-10-01T12:00:00Z");
    const { id } = await insertSleepSession(family.babyId, {
      createdById: family.ana,
      startedAt: new Date("2026-10-01T11:00:00Z"),
      endedAt,
    });

    await expect(stopSleepSession({ id })).resolves.toMatchObject({
      ok: true,
      data: { endedAt: endedAt.toISOString(), wasAlreadyStopped: true },
    });
  });

  it("answers NOT_FOUND for another household's session and leaves it running", async () => {
    const theirs = await createFamily();
    const { id } = await insertSleepSession(theirs.babyId, {
      createdById: theirs.userId,
      endedAt: null,
    });
    await familyWithTwoParents();

    await expect(stopSleepSession({ id })).resolves.toMatchObject({
      ok: false,
      error: { code: "NOT_FOUND" },
    });
    await expect(runningSessions(theirs.babyId)).resolves.toBe(1);
  });
});

describe("createSleepSession", () => {
  const manual = {
    startedAt: "2026-10-01T13:00",
    endedAt: "2026-10-01T14:30",
  };

  it("adds a finished sleep, even while a timer is running", async () => {
    const family = await familyWithTwoParents();
    await insertSleepSession(family.babyId, {
      createdById: family.ana,
      endedAt: null,
    });
    const id = randomUUID();

    const result = await createSleepSession({
      id,
      babyId: family.babyId,
      ...manual,
    });

    expect(result).toEqual({ ok: true, data: { id } });
    await expect(
      db.sleepSession.findUniqueOrThrow({ where: { id } }),
    ).resolves.toMatchObject({
      startedAt: new Date("2026-10-01T11:00:00Z"),
      endedAt: new Date("2026-10-01T12:30:00Z"),
    });
  });

  it("creates a single sleep on a double tap", async () => {
    const family = await familyWithTwoParents();
    const input = { id: randomUUID(), babyId: family.babyId, ...manual };

    await Promise.all([createSleepSession(input), createSleepSession(input)]);

    await expect(
      db.sleepSession.count({ where: { babyId: family.babyId } }),
    ).resolves.toBe(1);
  });
});

describe("updateSleepSession", () => {
  it("edits a finished session and records the editor", async () => {
    const family = await familyWithTwoParents();
    const { id } = await insertSleepSession(family.babyId, {
      createdById: family.ana,
    });

    const result = await actingAs(family.luis, () =>
      updateSleepSession({
        id,
        startedAt: "2026-10-01T13:00",
        endedAt: "2026-10-01T15:00",
      }),
    );

    expect(result).toEqual({ ok: true, data: { id } });
    await expect(
      db.sleepSession.findUniqueOrThrow({ where: { id } }),
    ).resolves.toMatchObject({
      endedAt: new Date("2026-10-01T13:00:00Z"),
      updatedById: family.luis,
    });
  });

  it("refuses to touch a running session: it can only be stopped", async () => {
    const family = await familyWithTwoParents();
    const { id } = await insertSleepSession(family.babyId, {
      createdById: family.ana,
      endedAt: null,
    });

    await expect(
      updateSleepSession({
        id,
        startedAt: "2026-10-01T13:00",
        endedAt: "2026-10-01T15:00",
      }),
    ).resolves.toEqual({
      ok: false,
      error: { code: "CONFLICT", message: "Para la siesta antes de editarla." },
    });
    await expect(runningSessions(family.babyId)).resolves.toBe(1);
  });

  it("answers NOT_FOUND for another household's session", async () => {
    const theirs = await createFamily();
    const { id } = await insertSleepSession(theirs.babyId, {
      createdById: theirs.userId,
    });
    await familyWithTwoParents();

    await expect(
      updateSleepSession({
        id,
        startedAt: "2026-10-01T13:00",
        endedAt: "2026-10-01T15:00",
      }),
    ).resolves.toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });
});

describe("deleteSleepSession", () => {
  it("deletes a timer started by mistake, so a new one can start", async () => {
    const family = await familyWithTwoParents();
    const { id } = await insertSleepSession(family.babyId, {
      createdById: family.ana,
      endedAt: null,
    });

    await expect(deleteSleepSession({ id })).resolves.toMatchObject({
      ok: true,
    });
    await expect(deleteSleepSession({ id })).resolves.toMatchObject({
      ok: true,
    });
    await expect(
      startSleepSession({ id: randomUUID(), babyId: family.babyId }),
    ).resolves.toMatchObject({ ok: true });
  });

  it("never deletes another household's session", async () => {
    const theirs = await createFamily();
    const { id } = await insertSleepSession(theirs.babyId, {
      createdById: theirs.userId,
    });
    await familyWithTwoParents();

    await expect(deleteSleepSession({ id })).resolves.toMatchObject({
      ok: true,
    });
    await expect(db.sleepSession.count({ where: { id } })).resolves.toBe(1);
  });
});
