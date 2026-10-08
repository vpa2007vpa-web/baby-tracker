import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  deleteGrowthMeasurementSchema,
  growthMeasurementSchemas,
} from "@/features/growth/schemas";

const { createGrowthMeasurementSchema, updateGrowthMeasurementSchema } =
  growthMeasurementSchemas("Europe/Madrid");

function createInput(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id: randomUUID(),
    babyId: randomUUID(),
    measuredAt: "2026-10-01T09:30",
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

describe("createGrowthMeasurementSchema", () => {
  it("takes kg and cm, as the paediatrician says them, and stores g and mm", () => {
    const result = createGrowthMeasurementSchema.parse(
      createInput({
        weightKg: "4,85",
        lengthCm: "56.5",
        headCircumferenceCm: 38,
      }),
    );

    expect(result).toMatchObject({
      measuredAt: new Date("2026-10-01T07:30:00Z"),
      weightGrams: 4850,
      lengthMm: 565,
      headCircumferenceMm: 380,
    });
    expect(result).not.toHaveProperty("weightKg");
  });

  it("rounds to whole grams and millimetres", () => {
    const result = createGrowthMeasurementSchema.parse(
      createInput({ weightKg: "4,8506", lengthCm: "56,54" }),
    );
    expect(result).toMatchObject({ weightGrams: 4851, lengthMm: 565 });
  });

  it("accepts a single measure and leaves the empty ones out", () => {
    const result = createGrowthMeasurementSchema.parse(
      createInput({ weightKg: "5,1", lengthCm: "", headCircumferenceCm: "" }),
    );
    expect(result).toMatchObject({
      weightGrams: 5100,
      lengthMm: undefined,
      headCircumferenceMm: undefined,
    });
  });

  it("asks for at least one measure", () => {
    expect(
      fieldErrors(createGrowthMeasurementSchema.safeParse(createInput())),
    ).toEqual({ weightKg: "Indica al menos una medida." });
  });

  it("rejects implausible values with the expected range", () => {
    const result = createGrowthMeasurementSchema.safeParse(
      createInput({
        weightKg: "48,5",
        lengthCm: "5",
        headCircumferenceCm: "abc",
      }),
    );
    expect(fieldErrors(result)).toEqual({
      weightKg: "El peso debe estar entre 0,5 y 30 kg.",
      lengthCm: "La longitud debe estar entre 25 y 130 cm.",
      headCircumferenceCm: "Escribe el perímetro craneal en cm, como 38,5.",
    });
  });
});

describe("updateGrowthMeasurementSchema", () => {
  it("needs the id but not the baby", () => {
    const result = updateGrowthMeasurementSchema.parse({
      id: randomUUID(),
      measuredAt: "2026-10-01T09:30",
      lengthCm: "57",
    });
    expect(result).toMatchObject({ lengthMm: 570 });
    expect(result).not.toHaveProperty("babyId");
  });
});

describe("deleteGrowthMeasurementSchema", () => {
  it("only needs the id", () => {
    const id = randomUUID();
    expect(deleteGrowthMeasurementSchema.parse({ id })).toEqual({ id });
  });
});
