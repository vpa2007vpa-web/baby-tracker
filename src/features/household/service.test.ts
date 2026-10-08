import { describe, expect, it } from "vitest";

import {
  INVITE_CODE_ALPHABET,
  INVITE_CODE_LENGTH,
} from "@/features/household/invite-code";
import {
  generateInviteCode,
  getInviteExpiry,
  hashInviteCode,
} from "@/features/household/service";

describe("generateInviteCode", () => {
  it("draws every character from the alphabet with the injected random source", () => {
    const draws: number[] = [];
    const code = generateInviteCode((max) => {
      draws.push(max);
      return draws.length % max;
    });

    expect(code).toHaveLength(INVITE_CODE_LENGTH);
    expect(draws).toEqual(Array.from({ length: INVITE_CODE_LENGTH }, () => 32));
    expect(code).toBe("123456789A");
  });

  it("only produces alphabet characters with the real CSPRNG", () => {
    const codes = Array.from({ length: 200 }, () => generateInviteCode());
    for (const code of codes) {
      expect(
        [...code].every((char) => INVITE_CODE_ALPHABET.includes(char)),
      ).toBe(true);
    }
    expect(new Set(codes).size).toBe(codes.length);
  });
});

describe("hashInviteCode", () => {
  it("is a deterministic SHA-256 hex digest that never contains the code", () => {
    const hash = hashInviteCode("ABCDEFGHJK");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hashInviteCode("ABCDEFGHJK")).toBe(hash);
    expect(hash).not.toContain("abcdefghjk");
  });
});

describe("getInviteExpiry", () => {
  it("expires 24 hours after creation", () => {
    expect(
      getInviteExpiry(new Date("2026-10-08T12:00:00Z")).toISOString(),
    ).toBe("2026-10-09T12:00:00.000Z");
  });
});
