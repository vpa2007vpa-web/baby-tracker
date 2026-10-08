import { randomUUID } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import { createHousehold } from "@/features/household/actions";
import { db } from "@/lib/db";
import { parseDateOnly } from "@/lib/dates";
import { session } from "@/test/action-mocks";
import { createFamily } from "@/test/factories";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));
// The double reads the session from `session` and the household from the real
// database, so authorization is exercised for real.
vi.mock("@/features/auth/session", async () => {
  const { session: current } = await import("@/test/action-mocks");
  const { getMemberByUserId } = await import("@/features/auth/queries");
  return {
    requireUserId: vi.fn(async () => current.userId),
    requireMember: vi.fn(async () => {
      const member = await getMemberByUserId(current.userId);
      if (!member) throw new Error("REDIRECT:/join");
      return member;
    }),
  };
});

const DAY_MS = 24 * 60 * 60 * 1000;
// Relative to today so the "at most three years old" rule never expires the test.
const BIRTH_DATE = new Date(Date.now() - 30 * DAY_MS)
  .toISOString()
  .slice(0, 10);

function validInput(): Record<string, unknown> {
  return {
    householdId: randomUUID(),
    babyId: randomUUID(),
    displayName: "Ana",
    babyName: "Lucía",
    babyBirthDate: BIRTH_DATE,
  };
}

describe("createHousehold", () => {
  it("creates the household, its OWNER and the baby, then goes home", async () => {
    session.userId = randomUUID();
    await expect(createHousehold(validInput())).rejects.toThrow("REDIRECT:/");

    const member = await db.householdMember.findUniqueOrThrow({
      where: { userId: session.userId },
      include: { household: { include: { babies: true } } },
    });
    expect(member).toMatchObject({ role: "OWNER", displayName: "Ana" });
    expect(member.household.babies).toHaveLength(1);
    expect(member.household.babies[0]?.birthDate).toEqual(
      parseDateOnly(BIRTH_DATE, "Europe/Madrid"),
    );
  });

  it("is idempotent on a repeated submit with the same ids", async () => {
    session.userId = randomUUID();
    const input = validInput();
    await expect(createHousehold(input)).rejects.toThrow("REDIRECT:/");
    await expect(createHousehold(input)).rejects.toThrow("REDIRECT:/");
    expect(await db.household.count()).toBe(1);
  });

  it("creates a single household on a simultaneous double tap", async () => {
    session.userId = randomUUID();
    const input = validInput();
    const outcomes = await Promise.allSettled([
      createHousehold(input),
      createHousehold(input),
    ]);

    expect(
      outcomes.map((outcome) =>
        outcome.status === "rejected" && outcome.reason instanceof Error
          ? outcome.reason.message
          : "returned",
      ),
    ).toEqual(["REDIRECT:/", "REDIRECT:/"]);
    expect(await db.household.count()).toBe(1);
    expect(await db.baby.count()).toBe(1);
  });

  it("returns field errors and writes nothing on invalid input", async () => {
    session.userId = randomUUID();
    const result = await createHousehold({ ...validInput(), babyName: " " });
    expect(result).toMatchObject({
      ok: false,
      error: {
        code: "VALIDATION",
        fieldErrors: { babyName: expect.any(Array) },
      },
    });
    expect(await db.household.count()).toBe(0);
  });

  it("does not create a second household for a user who already has one", async () => {
    const family = await createFamily();
    session.userId = family.userId;
    await expect(createHousehold(validInput())).rejects.toThrow("REDIRECT:/");
    expect(await db.household.count()).toBe(1);
  });
});
