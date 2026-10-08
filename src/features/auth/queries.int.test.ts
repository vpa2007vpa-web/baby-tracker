import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import { getMemberDisplayName } from "@/features/auth/queries";
import { createFamily, createMember } from "@/test/factories";

describe("getMemberDisplayName", () => {
  it("names a member of the household", async () => {
    const family = await createFamily();
    const partner = await createMember(family.householdId, {
      role: "MEMBER",
      displayName: "Luis",
    });

    await expect(
      getMemberDisplayName(partner.userId, family.householdId),
    ).resolves.toBe("Luis");
  });

  it("never names someone from another household, nor a stranger", async () => {
    const mine = await createFamily();
    const theirs = await createFamily();

    await expect(
      getMemberDisplayName(theirs.userId, mine.householdId),
    ).resolves.toBeNull();
    await expect(
      getMemberDisplayName(randomUUID(), mine.householdId),
    ).resolves.toBeNull();
  });
});
