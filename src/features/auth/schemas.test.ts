import { describe, expect, it } from "vitest";

import {
  requestEmailOtpSchema,
  verifyEmailOtpSchema,
} from "@/features/auth/schemas";

describe("requestEmailOtpSchema", () => {
  it("normalizes what mobile keyboards add (spaces, capitals)", () => {
    expect(
      requestEmailOtpSchema.parse({ email: "  Ana@Example.COM " }),
    ).toEqual({
      email: "ana@example.com",
    });
  });

  it.each(["", "ana", "ana@", "@example.com"])("rejects %j", (email) => {
    expect(requestEmailOtpSchema.safeParse({ email }).success).toBe(false);
  });
});

describe("verifyEmailOtpSchema", () => {
  it("accepts exactly eight digits, as Supabase Auth sends them", () => {
    expect(
      verifyEmailOtpSchema.parse({
        email: "ana@example.com",
        token: " 01234567 ",
      }),
    ).toEqual({ email: "ana@example.com", token: "01234567" });
  });

  it.each(["123456", "1234567", "123456789", "1234a567", ""])(
    "rejects token %j",
    (token) => {
      const result = verifyEmailOtpSchema.safeParse({
        email: "ana@example.com",
        token,
      });
      expect(result.success).toBe(false);
    },
  );
});
