import { afterEach, describe, expect, it, vi } from "vitest";

import { createHousehold } from "@/features/household/actions";

// Failure paths the integration suite cannot provoke: the database going
// away mid-action. Everything the action touches is doubled here.
const { createMock, getMemberByUserId } = vi.hoisted(() => ({
  createMock: vi.fn(),
  getMemberByUserId: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));
vi.mock("@/lib/env", () => ({ env: { APP_TIMEZONE: "Europe/Madrid" } }));
vi.mock("@/lib/db", () => ({ db: { household: { create: createMock } } }));
vi.mock("@/features/auth/queries", () => ({ getMemberByUserId }));
vi.mock("@/features/auth/session", () => ({
  requireUserId: vi.fn(async () => "5eed0000-0000-4000-8000-0000000000aa"),
  requireMember: vi.fn(),
}));

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

const DAY_MS = 24 * 60 * 60 * 1000;
const INPUT = {
  householdId: "5eed0000-0000-4000-8000-000000000001",
  babyId: "5eed0000-0000-4000-8000-000000000002",
  displayName: "Ana",
  babyName: "Lucía",
  babyBirthDate: new Date(Date.now() - 30 * DAY_MS).toISOString().slice(0, 10),
};

describe("createHousehold when the database fails", () => {
  it("answers UNEXPECTED instead of throwing when the recovery lookup fails too", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const outage = Object.assign(new Error("connection lost"), {
      code: "P1001",
    });
    getMemberByUserId
      .mockResolvedValueOnce(null) // no household yet: go ahead and create
      .mockRejectedValueOnce(outage); // recovery check after the failed insert
    createMock.mockRejectedValueOnce(outage);

    await expect(createHousehold(INPUT)).resolves.toMatchObject({
      ok: false,
      error: { code: "UNEXPECTED" },
    });
  });
});
