import { describe, expect, it } from "vitest";

import {
  getActiveFeeding,
  getFeeding,
  getLastBottleFeeding,
  getLastBreastFeeding,
  getLastFeeding,
  listFeedingsByDay,
} from "@/features/feeding/queries";
import { getDayRange } from "@/lib/dates";
import { createBaby, createFamily, createFeeding } from "@/test/factories";

const MADRID = "Europe/Madrid";
const SEP_30 = getDayRange(new Date("2026-09-30T12:00:00Z"), MADRID);
const OCT_1 = getDayRange(new Date("2026-10-01T12:00:00Z"), MADRID);

describe("listFeedingsByDay", () => {
  it("lists bottles of the day and breast feedings across midnight on both days", async () => {
    const family = await createFamily();
    const author = { createdById: family.userId };
    const midnightBreast = await createFeeding(family.babyId, {
      ...author,
      startedAt: new Date("2026-09-30T21:50:00Z"), // 23:50 on Sep 30
      endedAt: new Date("2026-09-30T22:10:00Z"), // 00:10 on Oct 1
    });
    const morningBottle = await createFeeding(family.babyId, {
      ...author,
      type: "BOTTLE",
      startedAt: new Date("2026-10-01T07:00:00Z"),
    });

    const oct1 = await listFeedingsByDay(family.babyId, OCT_1);
    const sep30 = await listFeedingsByDay(family.babyId, SEP_30);

    expect(oct1.map(({ id }) => id)).toEqual([
      morningBottle.id,
      midnightBreast.id,
    ]);
    expect(sep30.map(({ id }) => id)).toEqual([midnightBreast.id]);
  });

  it("never treats an earlier bottle as a running feeding", async () => {
    const family = await createFamily();
    // Bottles have no end: endedAt stays null forever.
    await createFeeding(family.babyId, {
      createdById: family.userId,
      type: "BOTTLE",
      startedAt: new Date("2026-09-30T10:00:00Z"),
    });

    await expect(listFeedingsByDay(family.babyId, OCT_1)).resolves.toEqual([]);
  });

  it("includes a breast feeding still running from the day before", async () => {
    const family = await createFamily();
    const running = await createFeeding(family.babyId, {
      createdById: family.userId,
      startedAt: new Date("2026-09-30T21:55:00Z"),
      endedAt: null,
    });

    const oct1 = await listFeedingsByDay(family.babyId, OCT_1);

    expect(oct1.map(({ id }) => id)).toEqual([running.id]);
  });

  it("never mixes in another baby's feedings", async () => {
    const family = await createFamily();
    const sibling = await createBaby(family.householdId);
    await createFeeding(sibling.babyId, {
      createdById: family.userId,
      type: "BOTTLE",
      startedAt: new Date("2026-10-01T07:00:00Z"),
    });

    await expect(listFeedingsByDay(family.babyId, OCT_1)).resolves.toEqual([]);
  });
});

describe("getActiveFeeding", () => {
  it("returns the running breast feeding and never a bottle", async () => {
    const family = await createFamily();
    const author = { createdById: family.userId };
    await createFeeding(family.babyId, { ...author, type: "BOTTLE" });
    await expect(getActiveFeeding(family.babyId)).resolves.toBeNull();

    const running = await createFeeding(family.babyId, {
      ...author,
      type: "BREAST_RIGHT",
      endedAt: null,
    });

    await expect(getActiveFeeding(family.babyId)).resolves.toMatchObject({
      id: running.id,
      type: "BREAST_RIGHT",
      createdById: family.userId,
    });
  });
});

describe("getLastFeeding and getLastBreastFeeding", () => {
  it("return the latest feeding of any kind, and the latest breast one", async () => {
    const family = await createFamily();
    const author = { createdById: family.userId };
    const breast = await createFeeding(family.babyId, {
      ...author,
      type: "BREAST_LEFT",
      startedAt: new Date("2026-10-01T07:00:00Z"),
      endedAt: new Date("2026-10-01T07:20:00Z"),
    });
    const laterBottle = await createFeeding(family.babyId, {
      ...author,
      type: "BOTTLE",
      startedAt: new Date("2026-10-01T10:00:00Z"),
    });

    await expect(getLastFeeding(family.babyId)).resolves.toMatchObject({
      id: laterBottle.id,
    });
    await expect(getLastBreastFeeding(family.babyId)).resolves.toMatchObject({
      id: breast.id,
      type: "BREAST_LEFT",
    });
  });

  it("return null without any feeding", async () => {
    const family = await createFamily();
    await expect(getLastFeeding(family.babyId)).resolves.toBeNull();
    await expect(getLastBreastFeeding(family.babyId)).resolves.toBeNull();
  });

  it("never return a sibling's feeding", async () => {
    // "Hoy" shows the last feeding with its author: never another baby's.
    const family = await createFamily();
    const sibling = await createBaby(family.householdId);
    await createFeeding(sibling.babyId, { createdById: family.userId });

    await expect(getLastFeeding(family.babyId)).resolves.toBeNull();
    await expect(getLastBreastFeeding(family.babyId)).resolves.toBeNull();
  });
});

describe("getFeeding", () => {
  it("returns a feeding of the given baby, else null", async () => {
    const mine = await createFamily();
    const theirs = await createFamily();
    const own = await createFeeding(mine.babyId, { createdById: mine.userId });
    const foreign = await createFeeding(theirs.babyId, {
      createdById: theirs.userId,
    });

    await expect(getFeeding(mine.babyId, own.id)).resolves.toMatchObject({
      id: own.id,
    });
    await expect(getFeeding(mine.babyId, foreign.id)).resolves.toBeNull();
    await expect(getFeeding(mine.babyId, "not-a-uuid")).resolves.toBeNull();
  });
});

describe("getLastBottleFeeding", () => {
  it("returns the amount and milk of the latest bottle, ignoring breast feedings", async () => {
    const family = await createFamily();
    const author = { createdById: family.userId };
    await createFeeding(family.babyId, {
      ...author,
      type: "BOTTLE",
      startedAt: new Date("2026-10-01T07:00:00Z"),
      amountMl: 90,
      bottleContent: "BREAST_MILK",
    });
    await createFeeding(family.babyId, {
      ...author,
      type: "BOTTLE",
      startedAt: new Date("2026-10-01T10:00:00Z"),
      amountMl: 120,
      bottleContent: "FORMULA",
    });
    await createFeeding(family.babyId, {
      ...author,
      startedAt: new Date("2026-10-01T12:00:00Z"),
      endedAt: new Date("2026-10-01T12:20:00Z"),
    });

    await expect(getLastBottleFeeding(family.babyId)).resolves.toEqual({
      amountMl: 120,
      bottleContent: "FORMULA",
    });
  });

  it("returns null without bottles, and never another baby's", async () => {
    const family = await createFamily();
    const sibling = await createBaby(family.householdId);
    await createFeeding(sibling.babyId, {
      createdById: family.userId,
      type: "BOTTLE",
    });

    await expect(getLastBottleFeeding(family.babyId)).resolves.toBeNull();
  });
});
