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
  it("accepts exactly six digits", () => {
    expect(
      verifyEmailOtpSchema.parse({
        email: "ana@example.com",
        token: " 012345 ",
      }),
    ).toEqual({ email: "ana@example.com", token: "012345" });
  });

  it.each(["12345", "1234567", "12a456", ""])("rejects token %j", (token) => {
    const result = verifyEmailOtpSchema.safeParse({
      email: "ana@example.com",
      token,
    });
    expect(result.success).toBe(false);
  });
});
