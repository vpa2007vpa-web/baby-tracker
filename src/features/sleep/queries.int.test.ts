import { describe, expect, it } from "vitest";

import {
  getActiveSleepSession,
  getLastSleepSession,
  getSleepSession,
  listSleepSessionsByDay,
} from "@/features/sleep/queries";
import { getDayRange } from "@/lib/dates";
import { createBaby, createFamily, createSleepSession } from "@/test/factories";

const MADRID = "Europe/Madrid";
const SEP_30 = getDayRange(new Date("2026-09-30T12:00:00Z"), MADRID);
const OCT_1 = getDayRange(new Date("2026-10-01T12:00:00Z"), MADRID);

describe("listSleepSessionsByDay", () => {
  it("shows a night across midnight on both days, newest first", async () => {
    const family = await createFamily();
    const author = { createdById: family.userId };
    const night = await createSleepSession(family.babyId, {
      ...author,
      startedAt: new Date("2026-09-30T20:30:00Z"), // 22:30 on Sep 30
      endedAt: new Date("2026-10-01T04:15:00Z"), // 06:15 on Oct 1
    });
    const nap = await createSleepSession(family.babyId, {
      ...author,
      startedAt: new Date("2026-10-01T11:00:00Z"),
      endedAt: new Date("2026-10-01T12:30:00Z"),
    });
    const previousNap = await createSleepSession(family.babyId, {
      ...author,
      startedAt: new Date("2026-09-30T12:00:00Z"),
      endedAt: new Date("2026-09-30T13:00:00Z"),
    });

    const oct1 = await listSleepSessionsByDay(family.babyId, OCT_1);
    const sep30 = await listSleepSessionsByDay(family.babyId, SEP_30);

    expect(oct1.map(({ id }) => id)).toEqual([nap.id, night.id]);
    expect(sep30.map(({ id }) => id)).toEqual([night.id, previousNap.id]);
  });

  it("includes the session still running, even if it began the day before", async () => {
    const family = await createFamily();
    const running = await createSleepSession(family.babyId, {
      createdById: family.userId,
      startedAt: new Date("2026-09-30T21:00:00Z"),
      endedAt: null,
    });

    const oct1 = await listSleepSessionsByDay(family.babyId, OCT_1);

    expect(oct1).toEqual([
      expect.objectContaining({ id: running.id, endedAt: null }),
    ]);
  });

  it("never mixes in another baby's sleep", async () => {
    const family = await createFamily();
    const sibling = await createBaby(family.householdId);
    await createSleepSession(sibling.babyId, {
      createdById: family.userId,
      startedAt: new Date("2026-10-01T11:00:00Z"),
      endedAt: new Date("2026-10-01T12:00:00Z"),
    });

    await expect(listSleepSessionsByDay(family.babyId, OCT_1)).resolves.toEqual(
      [],
    );
  });
});

describe("getActiveSleepSession", () => {
  it("returns the running session with its author, or null", async () => {
    const family = await createFamily();
    await createSleepSession(family.babyId, { createdById: family.userId });
    await expect(getActiveSleepSession(family.babyId)).resolves.toBeNull();

    const running = await createSleepSession(family.babyId, {
      createdById: family.userId,
      endedAt: null,
    });

    await expect(getActiveSleepSession(family.babyId)).resolves.toMatchObject({
      id: running.id,
      createdById: family.userId,
    });
  });
});

describe("getLastSleepSession", () => {
  it("returns the latest finished session, ignoring the running one", async () => {
    const family = await createFamily();
    const author = { createdById: family.userId };
    await createSleepSession(family.babyId, {
      ...author,
      startedAt: new Date("2026-10-01T08:00:00Z"),
      endedAt: new Date("2026-10-01T09:00:00Z"),
    });
    const latest = await createSleepSession(family.babyId, {
      ...author,
      startedAt: new Date("2026-10-01T11:00:00Z"),
      endedAt: new Date("2026-10-01T12:00:00Z"),
    });
    await createSleepSession(family.babyId, { ...author, endedAt: null });

    await expect(getLastSleepSession(family.babyId)).resolves.toMatchObject({
      id: latest.id,
    });
  });
});

describe("getSleepSession", () => {
  it("returns a session of the given baby, else null", async () => {
    const mine = await createFamily();
    const theirs = await createFamily();
    const own = await createSleepSession(mine.babyId, {
      createdById: mine.userId,
    });
    const foreign = await createSleepSession(theirs.babyId, {
      createdById: theirs.userId,
    });

    await expect(getSleepSession(mine.babyId, own.id)).resolves.toMatchObject({
      id: own.id,
    });
    await expect(getSleepSession(mine.babyId, foreign.id)).resolves.toBeNull();
    await expect(
      getSleepSession(mine.babyId, "not-a-uuid"),
    ).resolves.toBeNull();
  });
});
