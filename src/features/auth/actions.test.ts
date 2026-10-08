import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  requestEmailOtp,
  signOut,
  verifyEmailOtp,
} from "@/features/auth/actions";

// Supabase Auth is a network service: its answers are doubled here, with
// the error shapes the actions branch on (code and HTTP status).
const { signInWithOtp, verifyOtp, signOutOfSupabase } = vi.hoisted(() => ({
  signInWithOtp: vi.fn(),
  verifyOtp: vi.fn(),
  signOutOfSupabase: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    auth: { signInWithOtp, verifyOtp, signOut: signOutOfSupabase },
  }),
}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));

const EMAIL = "ana@example.com";
const CODE = "12345678";

function authError(code: string, status: number): Record<string, unknown> {
  return { name: "AuthApiError", message: "Supabase says no", code, status };
}

let consoleError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.clearAllMocks();
  consoleError.mockRestore();
});

describe("requestEmailOtp", () => {
  it("sends the code to the normalized email, creating the user if new", async () => {
    signInWithOtp.mockResolvedValue({ error: null });

    await expect(
      requestEmailOtp({ email: "  Ana@Example.com " }),
    ).resolves.toEqual({
      ok: true,
      data: undefined,
    });
    expect(signInWithOtp).toHaveBeenCalledWith({
      email: EMAIL,
      options: { shouldCreateUser: true },
    });
  });

  it("rejects a malformed email without calling Supabase", async () => {
    await expect(requestEmailOtp({ email: "ana" })).resolves.toMatchObject({
      ok: false,
      error: {
        code: "VALIDATION",
        fieldErrors: { email: [expect.any(String)] },
      },
    });
    expect(signInWithOtp).not.toHaveBeenCalled();
  });

  it("asks to wait when a code was sent moments ago", async () => {
    signInWithOtp.mockResolvedValue({
      error: authError("over_email_send_rate_limit", 429),
    });

    await expect(requestEmailOtp({ email: EMAIL })).resolves.toEqual({
      ok: false,
      error: {
        code: "CONFLICT",
        message:
          "Ya te enviamos un código hace poco. Espera un minuto y pide otro.",
        fieldErrors: undefined,
      },
    });
  });

  it("hides unexpected Supabase errors and never logs the email", async () => {
    signInWithOtp.mockResolvedValue({
      error: authError("unexpected_failure", 500),
    });

    await expect(requestEmailOtp({ email: EMAIL })).resolves.toMatchObject({
      ok: false,
      error: { code: "UNEXPECTED" },
    });
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain(EMAIL);
  });
});

describe("verifyEmailOtp", () => {
  it("signs in and goes home", async () => {
    verifyOtp.mockResolvedValue({ error: null });

    await expect(verifyEmailOtp({ email: EMAIL, token: CODE })).rejects.toThrow(
      "REDIRECT:/",
    );
    expect(verifyOtp).toHaveBeenCalledWith({
      email: EMAIL,
      token: CODE,
      type: "email",
    });
  });

  it("marks a wrong or expired code on the code field", async () => {
    verifyOtp.mockResolvedValue({ error: authError("otp_expired", 403) });

    await expect(
      verifyEmailOtp({ email: EMAIL, token: CODE }),
    ).resolves.toMatchObject({
      ok: false,
      error: {
        code: "VALIDATION",
        fieldErrors: {
          token: [
            "Ese código no vale o ha caducado. Revisa el email o pide uno nuevo.",
          ],
        },
      },
    });
  });

  it("asks to wait after too many attempts", async () => {
    verifyOtp.mockResolvedValue({
      error: authError("over_request_rate_limit", 429),
    });

    await expect(
      verifyEmailOtp({ email: EMAIL, token: CODE }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "CONFLICT" },
    });
  });

  it("rejects a code of the wrong length without calling Supabase", async () => {
    await expect(
      verifyEmailOtp({ email: EMAIL, token: "123456" }),
    ).resolves.toMatchObject({
      ok: false,
      error: {
        code: "VALIDATION",
        fieldErrors: { token: [expect.any(String)] },
      },
    });
    expect(verifyOtp).not.toHaveBeenCalled();
  });
});

describe("signOut", () => {
  it("goes to the login even when Supabase fails, logging only the failure", async () => {
    signOutOfSupabase.mockResolvedValue({
      error: authError("unexpected_failure", 500),
    });

    await expect(signOut()).rejects.toThrow("REDIRECT:/login");
    expect(consoleError).toHaveBeenCalledTimes(1);
  });
});
