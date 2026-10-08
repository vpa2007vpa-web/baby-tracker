import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  deleteHealthRecordSchema,
  healthRecordSchemas,
} from "@/features/health/schemas";

const { createHealthRecordSchema, updateHealthRecordSchema } =
  healthRecordSchemas("Europe/Madrid");

function createInput(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id: randomUUID(),
    babyId: randomUUID(),
    kind: "MEDICATION",
    name: "Paracetamol",
    administeredAt: "2026-10-01T09:30",
    ...overrides,
  };
}

function fieldErrors(result: {
  error?: { issues: { path: PropertyKey[]; message: string }[] };
}): Record<string, string> {
  return Object.fromEntries(
    (result.error?.issues ?? []).map((issue) => [
      String(issue.path[0]),
      issue.message,
    ]),
  );
}

describe("createHealthRecordSchema", () => {
  it("accepts a vaccine with its position in the series", () => {
    const result = createHealthRecordSchema.parse(
      createInput({
        kind: "VACCINE",
        name: "  Hexavalente ",
        doseNumber: "2",
        reaction: "Febrícula",
      }),
    );

    expect(result).toMatchObject({
      kind: "VACCINE",
      name: "Hexavalente",
      doseNumber: 2,
      reaction: "Febrícula",
      administeredAt: new Date("2026-10-01T07:30:00Z"),
    });
  });

  it("accepts a decimal dose with its unit", () => {
    const result = createHealthRecordSchema.parse(
      createInput({ doseAmount: "2,5", doseUnit: "ML" }),
    );
    expect(result).toMatchObject({ doseAmount: 2.5, doseUnit: "ML" });
  });

  it("drops a series number left on a medication instead of failing", () => {
    const result = createHealthRecordSchema.parse(
      createInput({ kind: "MEDICATION", doseNumber: "1" }),
    );
    expect(result.doseNumber).toBeUndefined();
  });

  it("needs the dose and its unit together", () => {
    expect(
      fieldErrors(
        createHealthRecordSchema.safeParse(createInput({ doseAmount: "5" })),
      ),
    ).toEqual({ doseUnit: "Elige la unidad de la dosis." });
    expect(
      fieldErrors(
        createHealthRecordSchema.safeParse(createInput({ doseUnit: "DROPS" })),
      ),
    ).toEqual({ doseAmount: "Escribe la cantidad de la dosis." });
  });

  it("explains each invalid field in Spanish", () => {
    const result = createHealthRecordSchema.safeParse(
      createInput({
        kind: "SURGERY",
        name: " ",
        doseAmount: "0",
        doseUnit: "SPOONS",
        doseNumber: "11",
      }),
    );
    expect(fieldErrors(result)).toEqual({
      kind: "Elige vacuna o medicamento.",
      name: "Escribe el nombre.",
      doseAmount: "La dosis debe ser mayor que 0.",
      doseUnit: "Elige una unidad de la lista.",
      doseNumber: "El número de dosis va de 1 a 10.",
    });
  });

  it("limits the name to 80 characters and the reaction to 500", () => {
    const result = createHealthRecordSchema.safeParse(
      createInput({ name: "x".repeat(81), reaction: "x".repeat(501) }),
    );
    expect(fieldErrors(result)).toEqual({
      name: "Usa 80 caracteres como máximo.",
      reaction: "Usa 500 caracteres como máximo.",
    });
  });
});

describe("updateHealthRecordSchema", () => {
  it("needs the id but not the baby", () => {
    const result = updateHealthRecordSchema.parse({
      id: randomUUID(),
      kind: "MEDICATION",
      name: "Vitamina D",
      administeredAt: "2026-10-01T09:30",
    });
    expect(result).not.toHaveProperty("babyId");
  });
});

describe("deleteHealthRecordSchema", () => {
  it("only needs the id", () => {
    const id = randomUUID();
    expect(deleteHealthRecordSchema.parse({ id })).toEqual({ id });
  });
});
