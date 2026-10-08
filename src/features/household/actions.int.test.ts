import { randomUUID } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import {
  createHousehold,
  createHouseholdInvite,
  joinHousehold,
} from "@/features/household/actions";
import { db } from "@/lib/db";
import { parseDateOnly } from "@/lib/dates";
import { createFamily, createInvite, createMember } from "@/test/factories";
import { session } from "@/test/session-double";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));
vi.mock("@/features/auth/session", () => import("@/test/session-double"));

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

const CODE_PATTERN = /^[0-9A-HJKMNP-TV-Z]{5}-[0-9A-HJKMNP-TV-Z]{5}$/;

/** A family whose OWNER has just generated an invite; returns the shown code. */
async function familyWithInvite(): Promise<{
  family: Awaited<ReturnType<typeof createFamily>>;
  code: string;
}> {
  const family = await createFamily();
  session.userId = family.userId;
  const result = await createHouseholdInvite();
  if (!result.ok) throw new Error(result.error.message);
  return { family, code: result.data.code };
}

async function outcomeOf(promise: Promise<unknown>): Promise<string> {
  return promise.then(
    (result) =>
      typeof result === "object" && result !== null && "error" in result
        ? JSON.stringify(result)
        : "returned",
    (error: unknown) => (error instanceof Error ? error.message : "thrown"),
  );
}

describe("createHouseholdInvite", () => {
  it("returns the code once and stores only its hash", async () => {
    const { family, code } = await familyWithInvite();

    expect(code).toMatch(CODE_PATTERN);
    const rows = await db.householdInvite.findMany({
      where: { householdId: family.householdId },
    });
    expect(rows).toHaveLength(1);
    expect(JSON.stringify(rows)).not.toContain(code.replace("-", ""));
  });

  it("replaces the previous pending invite", async () => {
    const { family, code: firstCode } = await familyWithInvite();
    session.userId = family.userId;
    await createHouseholdInvite();

    session.userId = randomUUID();
    expect(
      await joinHousehold({ displayName: "Pablo", code: firstCode }),
    ).toMatchObject({ ok: false, error: { code: "VALIDATION" } });
    expect(
      await db.householdInvite.count({
        where: { householdId: family.householdId },
      }),
    ).toBe(1);
  });

  it("refuses when the household already has two members", async () => {
    const family = await createFamily();
    await createMember(family.householdId, {
      role: "MEMBER",
      displayName: "Pablo",
    });
    session.userId = family.userId;
    expect(await createHouseholdInvite()).toMatchObject({
      ok: false,
      error: { code: "CONFLICT" },
    });
  });
});

describe("joinHousehold", () => {
  it("adds the user as MEMBER, spends the code and goes home", async () => {
    const { family, code } = await familyWithInvite();
    const partnerId = randomUUID();
    session.userId = partnerId;

    const typedOnAPhone = code.toLowerCase().replace("-", " ");
    await expect(
      joinHousehold({ displayName: "Pablo", code: typedOnAPhone }),
    ).rejects.toThrow("REDIRECT:/");
    expect(
      await db.householdMember.findUnique({ where: { userId: partnerId } }),
    ).toMatchObject({ householdId: family.householdId, role: "MEMBER" });
    expect(
      await db.householdInvite.findFirst({
        where: { householdId: family.householdId },
      }),
    ).toMatchObject({ usedById: partnerId });
  });

  it("answers unknown, used and expired codes identically", async () => {
    const { family, code } = await familyWithInvite();
    session.userId = randomUUID();
    await expect(joinHousehold({ displayName: "Pablo", code })).rejects.toThrow(
      "REDIRECT:/",
    );
    await createInvite(family.householdId, {
      code: "EXP1RED000",
      createdById: family.userId,
      expiresAt: new Date(Date.now() - 1000),
    });

    session.userId = randomUUID();
    const results = await Promise.all([
      joinHousehold({ displayName: "Eva", code }), // used
      joinHousehold({ displayName: "Eva", code: "EXP1RED000" }), // expired
      joinHousehold({ displayName: "Eva", code: "ZZZZZ-ZZZZZ" }), // unknown
    ]);

    expect(new Set(results.map((result) => JSON.stringify(result))).size).toBe(
      1,
    );
    expect(results[0]).toMatchObject({
      ok: false,
      error: { code: "VALIDATION", fieldErrors: { code: expect.any(Array) } },
    });
  });

  it("lets exactly one of two simultaneous redemptions win", async () => {
    const { family, code } = await familyWithInvite();

    const attempt = (userId: string): Promise<string> => {
      // The mocked requireUserId reads session.userId synchronously, before
      // the action's first await, so each call keeps its own user.
      session.userId = userId;
      return outcomeOf(joinHousehold({ displayName: "Pablo", code }));
    };
    const outcomes = await Promise.all([
      attempt(randomUUID()),
      attempt(randomUUID()),
    ]);

    expect(outcomes.filter((outcome) => outcome === "REDIRECT:/")).toHaveLength(
      1,
    );
    expect(
      outcomes.filter((outcome) => outcome.includes('"VALIDATION"')),
    ).toHaveLength(1);
    expect(
      await db.householdMember.count({
        where: { householdId: family.householdId },
      }),
    ).toBe(2);
  });

  it("rejects an old code once the household is full, without spending it", async () => {
    const { family, code } = await familyWithInvite();
    await createMember(family.householdId, {
      role: "MEMBER",
      displayName: "Pablo",
    });

    session.userId = randomUUID();
    expect(await joinHousehold({ displayName: "Eva", code })).toMatchObject({
      ok: false,
      error: { code: "CONFLICT" },
    });
    expect(
      await db.householdInvite.findFirst({
        where: { householdId: family.householdId },
      }),
    ).toMatchObject({ usedAt: null, usedById: null });
  });

  it("keeps an existing household and rejects joining another", async () => {
    const { family, code } = await familyWithInvite();
    const other = await createFamily();
    session.userId = other.userId;

    expect(await joinHousehold({ displayName: "Ana", code })).toMatchObject({
      ok: false,
      error: { code: "CONFLICT" },
    });
    expect(
      await db.householdMember.findUnique({ where: { userId: other.userId } }),
    ).toMatchObject({ householdId: other.householdId });
    expect(
      await db.householdInvite.findFirst({
        where: { householdId: family.householdId },
      }),
    ).toMatchObject({ usedAt: null });
  });
});
