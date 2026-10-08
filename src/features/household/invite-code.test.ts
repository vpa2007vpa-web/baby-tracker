import { describe, expect, it } from "vitest";

import {
  formatInviteCode,
  normalizeInviteCode,
} from "@/features/household/invite-code";

describe("normalizeInviteCode", () => {
  it.each([
    ["ABCDE-FGHJK", "ABCDEFGHJK"],
    ["abcde fghjk", "ABCDEFGHJK"],
    [" a b c d e - f g h j k ", "ABCDEFGHJK"],
    ["0O1IL-23456", "0011123456"], // Crockford aliases: O→0, I/L→1
  ])("reads %j as %j", (raw, expected) => {
    expect(normalizeInviteCode(raw)).toBe(expected);
  });

  it.each(["", "ABCDE", "ABCDE-FGHJKM", "ABCDE-FGHJU", "ABCDE-FGH*K"])(
    "rejects %j",
    (raw) => {
      expect(normalizeInviteCode(raw)).toBeNull();
    },
  );
});

describe("formatInviteCode", () => {
  it("groups the code in two blocks for reading aloud", () => {
    expect(formatInviteCode("ABCDEFGHJK")).toBe("ABCDE-FGHJK");
  });
});
