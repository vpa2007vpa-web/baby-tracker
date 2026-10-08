import { describe, expect, it } from "vitest";

import { getHealthRecord, listHealthRecords } from "@/features/health/queries";
import { createBaby, createFamily, createHealthRecord } from "@/test/factories";

describe("listHealthRecords", () => {
  it("lists vaccines and medications together, newest first", async () => {
    const family = await createFamily();
    const author = { createdById: family.userId };
    const vaccine = await createHealthRecord(family.babyId, {
      ...author,
      kind: "VACCINE",
      name: "Hexavalente",
      administeredAt: new Date("2026-09-01T09:00:00Z"),
    });
    const medication = await createHealthRecord(family.babyId, {
      ...author,
      administeredAt: new Date("2026-10-01T09:00:00Z"),
    });

    const records = await listHealthRecords(family.babyId);

    expect(records.map(({ id }) => id)).toEqual([medication.id, vaccine.id]);
    expect(records[1]).toMatchObject({
      kind: "VACCINE",
      name: "Hexavalente",
      doseAmount: null,
      createdById: family.userId,
    });
  });

  it("never mixes in another baby's records", async () => {
    const family = await createFamily();
    const sibling = await createBaby(family.householdId);
    await createHealthRecord(sibling.babyId, { createdById: family.userId });

    await expect(listHealthRecords(family.babyId)).resolves.toEqual([]);
  });
});

describe("getHealthRecord", () => {
  it("returns a record of the given baby, else null", async () => {
    const mine = await createFamily();
    const theirs = await createFamily();
    const own = await createHealthRecord(mine.babyId, {
      createdById: mine.userId,
    });
    const foreign = await createHealthRecord(theirs.babyId, {
      createdById: theirs.userId,
    });

    await expect(getHealthRecord(mine.babyId, own.id)).resolves.toMatchObject({
      id: own.id,
      name: "Vitamina D",
    });
    await expect(getHealthRecord(mine.babyId, foreign.id)).resolves.toBeNull();
    await expect(
      getHealthRecord(mine.babyId, "not-a-uuid"),
    ).resolves.toBeNull();
  });
});
