import { describe, expect, it } from "vitest";

import {
  getDiaperChange,
  getLastDiaperChange,
  listDiaperChangesByDay,
} from "@/features/diapers/queries";
import { getDayRange } from "@/lib/dates";
import { createBaby, createDiaperChange, createFamily } from "@/test/factories";

// Oct 1 in Madrid (UTC+2) runs from 22:00 UTC on Sep 30 to 22:00 UTC on Oct 1.
const OCT_1 = getDayRange(new Date("2026-10-01T12:00:00Z"), "Europe/Madrid");

describe("listDiaperChangesByDay", () => {
  it("lists the household day, newest first, not the UTC day", async () => {
    const family = await createFamily();
    const author = { createdById: family.userId };
    const lastOfDay = await createDiaperChange(family.babyId, {
      ...author,
      occurredAt: new Date("2026-10-01T21:59:00Z"), // 23:59 in Madrid
    });
    const firstOfDay = await createDiaperChange(family.babyId, {
      ...author,
      occurredAt: new Date("2026-09-30T22:00:00Z"), // 00:00 in Madrid
    });
    await createDiaperChange(family.babyId, {
      ...author,
      occurredAt: new Date("2026-10-01T22:00:00Z"), // Oct 2 in Madrid
    });

    const diapers = await listDiaperChangesByDay(family.babyId, OCT_1);

    expect(diapers.map(({ id }) => id)).toEqual([lastOfDay.id, firstOfDay.id]);
    expect(diapers[0]).toMatchObject({
      type: "WET",
      createdById: family.userId,
      updatedById: null,
    });
  });

  it("never mixes in another baby's diapers", async () => {
    const family = await createFamily();
    const sibling = await createBaby(family.householdId);
    await createDiaperChange(sibling.babyId, {
      createdById: family.userId,
      occurredAt: new Date("2026-10-01T10:00:00Z"),
    });

    await expect(listDiaperChangesByDay(family.babyId, OCT_1)).resolves.toEqual(
      [],
    );
  });
});

describe("getDiaperChange", () => {
  it("returns a diaper of the given baby", async () => {
    const family = await createFamily();
    const { id } = await createDiaperChange(family.babyId, {
      createdById: family.userId,
      type: "DIRTY",
    });

    await expect(getDiaperChange(family.babyId, id)).resolves.toMatchObject({
      id,
      type: "DIRTY",
    });
  });

  it("answers null for another baby's diaper and for malformed ids", async () => {
    const mine = await createFamily();
    const theirs = await createFamily();
    const { id } = await createDiaperChange(theirs.babyId, {
      createdById: theirs.userId,
    });

    await expect(getDiaperChange(mine.babyId, id)).resolves.toBeNull();
    await expect(
      getDiaperChange(mine.babyId, "not-a-uuid"),
    ).resolves.toBeNull();
  });
});

describe("getLastDiaperChange", () => {
  it("returns the most recent diaper, or null without any", async () => {
    const family = await createFamily();
    await expect(getLastDiaperChange(family.babyId)).resolves.toBeNull();

    await createDiaperChange(family.babyId, {
      createdById: family.userId,
      occurredAt: new Date("2026-10-01T08:00:00Z"),
    });
    const latest = await createDiaperChange(family.babyId, {
      createdById: family.userId,
      occurredAt: new Date("2026-10-01T09:00:00Z"),
    });

    await expect(getLastDiaperChange(family.babyId)).resolves.toMatchObject({
      id: latest.id,
    });
  });
});
