import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  deleteDiaperChangeSchema,
  diaperChangeSchemas,
} from "@/features/diapers/schemas";

const { createDiaperChangeSchema, updateDiaperChangeSchema } =
  diaperChangeSchemas("Europe/Madrid");

function createInput(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return { id: randomUUID(), babyId: randomUUID(), type: "WET", ...overrides };
}

function fieldErrors(result: {
  success: boolean;
  error?: { issues: { path: PropertyKey[]; message: string }[] };
}): Record<string, string> {
  return Object.fromEntries(
    (result.error?.issues ?? []).map((issue) => [
      String(issue.path[0]),
      issue.message,
    ]),
  );
}

describe("createDiaperChangeSchema", () => {
  it("accepts a one-tap diaper without a time: the server records now", () => {
    const result = createDiaperChangeSchema.parse(createInput());
    expect(result.occurredAt).toBeUndefined();
  });

  it("reads the time in the household zone", () => {
    const result = createDiaperChangeSchema.parse(
      createInput({ occurredAt: "2026-10-01T09:30" }),
    );
    expect(result.occurredAt?.toISOString()).toBe("2026-10-01T07:30:00.000Z");
  });

  it("keeps the stool details of a dirty or mixed diaper", () => {
    const result = createDiaperChangeSchema.parse(
      createInput({
        type: "MIXED",
        stoolColor: "YELLOW",
        stoolConsistency: "SEEDY",
      }),
    );
    expect(result).toMatchObject({
      stoolColor: "YELLOW",
      stoolConsistency: "SEEDY",
    });
  });

  it("drops stool details from a wet diaper instead of failing", () => {
    const result = createDiaperChangeSchema.parse(
      createInput({
        type: "WET",
        stoolColor: "GREEN",
        stoolConsistency: "WATERY",
      }),
    );
    expect(result.stoolColor).toBeUndefined();
    expect(result.stoolConsistency).toBeUndefined();
  });

  it("explains each invalid field in Spanish", () => {
    const result = createDiaperChangeSchema.safeParse(
      createInput({ id: "1", type: "WINDY", stoolColor: "PURPLE" }),
    );
    expect(fieldErrors(result)).toEqual({
      id: "Identificador no válido.",
      type: "Elige el tipo de pañal.",
      stoolColor: "Elige un color de la lista.",
    });
  });

  it("trims notes and limits them to 500 characters", () => {
    expect(
      createDiaperChangeSchema.parse(createInput({ notes: "  rojeces " }))
        .notes,
    ).toBe("rojeces");
    expect(
      fieldErrors(
        createDiaperChangeSchema.safeParse(
          createInput({ notes: "x".repeat(501) }),
        ),
      ),
    ).toEqual({ notes: "Usa 500 caracteres como máximo." });
  });
});

describe("updateDiaperChangeSchema", () => {
  it("requires the time: an edit always shows it", () => {
    const result = updateDiaperChangeSchema.safeParse({
      id: randomUUID(),
      type: "DIRTY",
    });
    expect(fieldErrors(result)).toEqual({
      occurredAt: "Indica la fecha y la hora.",
    });
  });

  it("drops stool details when an edit turns the diaper into a wet one", () => {
    const result = updateDiaperChangeSchema.parse({
      id: randomUUID(),
      occurredAt: "2026-10-01T09:30",
      type: "WET",
      stoolColor: "BROWN",
    });
    expect(result.stoolColor).toBeUndefined();
  });
});

describe("deleteDiaperChangeSchema", () => {
  it("only needs the id", () => {
    const id = randomUUID();
    expect(deleteDiaperChangeSchema.parse({ id })).toEqual({ id });
  });
});
