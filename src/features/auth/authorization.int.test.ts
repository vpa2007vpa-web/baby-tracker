import { describe, expect, it } from "vitest";

import { assertBabyInHousehold } from "@/features/auth/authorization";
import { getPrimaryBaby } from "@/features/auth/queries";
import { handleActionError, NotFoundError } from "@/lib/action-result";
import { createBaby, createFamily, createHousehold } from "@/test/factories";

describe("assertBabyInHousehold", () => {
  it("accepts a baby of the member's household", async () => {
    const family = await createFamily();
    await expect(
      assertBabyInHousehold(family.babyId, family.householdId),
    ).resolves.toBeUndefined();
  });

  it("rejects a baby of another household", async () => {
    const mine = await createFamily();
    const theirs = await createFamily();
    await expect(
      assertBabyInHousehold(theirs.babyId, mine.householdId),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("answers a foreign, a missing and a malformed id identically", async () => {
    const mine = await createFamily();
    const theirs = await createFamily();
    const attempts = [
      theirs.babyId,
      "5eed0000-0000-4000-8000-00000000dead",
      "not-a-uuid",
    ];

    const results = await Promise.all(
      attempts.map((babyId) =>
        assertBabyInHousehold(babyId, mine.householdId).then(
          () => "resolved",
          (error: unknown) => handleActionError("test", error),
        ),
      ),
    );

    expect(new Set(results.map((result) => JSON.stringify(result))).size).toBe(
      1,
    );
    expect(results[0]).toMatchObject({
      ok: false,
      error: { code: "NOT_FOUND" },
    });
  });
});

describe("getPrimaryBaby", () => {
  it("returns the household's first baby, never another household's", async () => {
    const { householdId } = await createHousehold();
    const { babyId } = await createBaby(householdId, {
      name: "Lucía",
      createdAt: new Date("2026-09-01T00:00:00Z"),
    });
    await createBaby(householdId, {
      name: "Pablo",
      createdAt: new Date("2026-09-02T00:00:00Z"),
    });
    await createFamily();

    expect(await getPrimaryBaby(householdId)).toMatchObject({
      id: babyId,
      name: "Lucía",
    });
  });

  it("returns null for a household without babies", async () => {
    const { householdId } = await createHousehold();
    expect(await getPrimaryBaby(householdId)).toBeNull();
  });
});
