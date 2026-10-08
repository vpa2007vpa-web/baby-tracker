import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import {
  formNumber,
  localDateTime,
  optionalText,
  recordId,
} from "@/lib/record-fields";

const MADRID = "Europe/Madrid";

function firstMessage(result: z.ZodSafeParseResult<unknown>): string {
  return result.success ? "" : (result.error.issues[0]?.message ?? "");
}

describe("localDateTime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // 14:00 on Oct 8 in Madrid (UTC+2).
    vi.setSystemTime(new Date("2026-10-08T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("reads the wall-clock time in the household time zone", () => {
    const result = localDateTime(MADRID).parse("2026-10-08T09:30");
    expect(result.toISOString()).toBe("2026-10-08T07:30:00.000Z");
  });

  it("depends on the zone it is given, never on the machine's", () => {
    const result = localDateTime("America/New_York").parse("2026-10-08T07:30");
    expect(result.toISOString()).toBe("2026-10-08T11:30:00.000Z");
  });

  it.each(["", "10:30", "2026-02-31T10:00", "not a date"])(
    "rejects %j as a missing or impossible time",
    (value) => {
      expect(firstMessage(localDateTime(MADRID).safeParse(value))).toBe(
        "Indica la fecha y la hora.",
      );
    },
  );

  it("tolerates a few minutes of clock drift between phone and server", () => {
    // 14:04 in Madrid, four minutes ahead of the server clock.
    expect(localDateTime(MADRID).safeParse("2026-10-08T14:04").success).toBe(
      true,
    );
  });

  it("rejects times in the future", () => {
    expect(
      firstMessage(localDateTime(MADRID).safeParse("2026-10-08T14:06")),
    ).toBe("La hora no puede ser futura.");
  });
});

describe("formNumber", () => {
  const amount = formNumber(
    z.number({ error: "Indica la cantidad." }).int().min(1),
  );
  const optionalDose = formNumber(z.number().positive().optional());

  it("accepts numbers from quick buttons and digits typed in a form", () => {
    expect(amount.parse(120)).toBe(120);
    expect(amount.parse(" 90 ")).toBe(90);
  });

  it("accepts a decimal comma", () => {
    expect(optionalDose.parse("2,5")).toBe(2.5);
  });

  it("treats an empty field as not given, never as zero", () => {
    expect(optionalDose.parse("")).toBeUndefined();
    expect(firstMessage(amount.safeParse(""))).toBe("Indica la cantidad.");
  });

  it("rejects text that is not a number", () => {
    expect(firstMessage(amount.safeParse("abc"))).toBe("Indica la cantidad.");
  });
});

describe("optionalText", () => {
  const notes = optionalText(5);

  it("trims and treats an empty text as not given", () => {
    expect(notes.parse("  hola ")).toBe("hola");
    expect(notes.parse("   ")).toBeUndefined();
    expect(notes.parse(undefined)).toBeUndefined();
  });

  it("limits the length", () => {
    expect(firstMessage(notes.safeParse("demasiado"))).toBe(
      "Usa 5 caracteres como máximo.",
    );
  });
});

describe("recordId", () => {
  it("explains a malformed id in Spanish", () => {
    expect(firstMessage(recordId.safeParse("1"))).toBe(
      "Identificador no válido.",
    );
  });
});
