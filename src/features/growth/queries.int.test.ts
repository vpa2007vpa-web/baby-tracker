import { describe, expect, it } from "vitest";

import {
  getGrowthMeasurement,
  getLatestGrowthMeasurement,
  listGrowthMeasurements,
} from "@/features/growth/queries";
import {
  createBaby,
  createFamily,
  createGrowthMeasurement,
} from "@/test/factories";

describe("listGrowthMeasurements", () => {
  it("lists the baby's history, newest first, in stored units", async () => {
    const family = await createFamily();
    const author = { createdById: family.userId };
    const older = await createGrowthMeasurement(family.babyId, {
      ...author,
      measuredAt: new Date("2026-09-01T09:00:00Z"),
      weightGrams: 3900,
    });
    const newer = await createGrowthMeasurement(family.babyId, {
      ...author,
      measuredAt: new Date("2026-10-01T09:00:00Z"),
      weightGrams: 4850,
    });

    const measurements = await listGrowthMeasurements(family.babyId);

    expect(measurements.map(({ id }) => id)).toEqual([newer.id, older.id]);
    expect(measurements[0]).toMatchObject({
      weightGrams: 4850,
      lengthMm: null,
      createdById: family.userId,
    });
  });

  it("never mixes in another baby's measurements", async () => {
    const family = await createFamily();
    const sibling = await createBaby(family.householdId);
    await createGrowthMeasurement(sibling.babyId, {
      createdById: family.userId,
    });

    await expect(listGrowthMeasurements(family.babyId)).resolves.toEqual([]);
  });
});

describe("getGrowthMeasurement", () => {
  it("returns a measurement of the given baby, else null", async () => {
    const mine = await createFamily();
    const theirs = await createFamily();
    const own = await createGrowthMeasurement(mine.babyId, {
      createdById: mine.userId,
    });
    const foreign = await createGrowthMeasurement(theirs.babyId, {
      createdById: theirs.userId,
    });

    await expect(
      getGrowthMeasurement(mine.babyId, own.id),
    ).resolves.toMatchObject({ id: own.id });
    await expect(
      getGrowthMeasurement(mine.babyId, foreign.id),
    ).resolves.toBeNull();
    await expect(
      getGrowthMeasurement(mine.babyId, "not-a-uuid"),
    ).resolves.toBeNull();
  });
});

describe("getLatestGrowthMeasurement", () => {
  it("returns the most recent measurement, or null without any", async () => {
    const family = await createFamily();
    await expect(getLatestGrowthMeasurement(family.babyId)).resolves.toBeNull();

    await createGrowthMeasurement(family.babyId, {
      createdById: family.userId,
      measuredAt: new Date("2026-09-01T09:00:00Z"),
    });
    const latest = await createGrowthMeasurement(family.babyId, {
      createdById: family.userId,
      measuredAt: new Date("2026-10-01T09:00:00Z"),
    });

    await expect(
      getLatestGrowthMeasurement(family.babyId),
    ).resolves.toMatchObject({ id: latest.id });
  });
});
