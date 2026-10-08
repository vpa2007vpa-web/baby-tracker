import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import {
  handleActionError,
  NotFoundError,
  ok,
  validationError,
} from "@/lib/action-result";

function prismaError(code: string, message: string): Error {
  return Object.assign(new Error(message), {
    name: "PrismaClientKnownRequestError",
    code,
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ok", () => {
  it("wraps data, and works without data for void actions", () => {
    expect(ok({ id: "x" })).toEqual({ ok: true, data: { id: "x" } });
    expect(ok()).toEqual({ ok: true, data: undefined });
  });
});

describe("validationError", () => {
  it("exposes only the fields that failed, with Spanish messages", () => {
    const schema = z.object({
      email: z.email({ error: "Escribe un email válido." }),
      name: z.string(),
    });
    const parsed = schema.safeParse({ email: "nope", name: "Ana" });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;

    expect(validationError(parsed.error)).toEqual({
      ok: false,
      error: {
        code: "VALIDATION",
        message: "Revisa los campos marcados.",
        fieldErrors: { email: ["Escribe un email válido."] },
      },
    });
  });
});

describe("handleActionError", () => {
  it("maps Prisma P2025 to NOT_FOUND and P2002 to CONFLICT", () => {
    const notFound = handleActionError("test", prismaError("P2025", "x"));
    const conflict = handleActionError("test", prismaError("P2002", "x"));
    expect(notFound).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    expect(conflict).toMatchObject({ ok: false, error: { code: "CONFLICT" } });
  });

  it("maps NotFoundError exactly like Prisma P2025, without logging it", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const fromAuthorization = handleActionError("test", new NotFoundError());
    const fromPrisma = handleActionError("test", prismaError("P2025", "x"));

    expect(fromAuthorization).toEqual(fromPrisma);
    expect(fromAuthorization).toMatchObject({
      ok: false,
      error: { code: "NOT_FOUND" },
    });
    expect(log).not.toHaveBeenCalled();
  });

  it("returns a generic message and never logs the raw error message", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const secret =
      "Invalid `db.feeding.create()` invocation: { notes: 'fiebre' }";

    const result = handleActionError(
      "createFeeding",
      prismaError("P1001", secret),
    );

    expect(result).toEqual({
      ok: false,
      error: {
        code: "UNEXPECTED",
        message: "Algo ha fallado. Inténtalo de nuevo.",
      },
    });
    expect(log).toHaveBeenCalledOnce();
    expect(JSON.stringify(log.mock.calls)).not.toContain("fiebre");
    expect(log.mock.calls[0]?.[0]).toBe("[createFeeding] failed");
  });
});
