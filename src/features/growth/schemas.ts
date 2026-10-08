import { z } from "zod";

import { formNumber, localDateTime, recordId } from "@/lib/record-fields";

const GRAMS_PER_KG = 1000;
const MM_PER_CM = 10;

/** Typed in kg or cm (decimal comma accepted), within a plausible range. */
function measure(range: {
  min: number;
  max: number;
  unit: string;
  invalid: string;
  label: string;
}) {
  const outOfRange = `${range.label} debe estar entre ${String(range.min).replace(".", ",")} y ${range.max} ${range.unit}.`;
  return formNumber(
    z
      .number({ error: range.invalid })
      .min(range.min, { error: outOfRange })
      .max(range.max, { error: outOfRange })
      .optional(),
  );
}

// Plausible for a baby up to three years old (the app's age limit).
const measureFields = {
  weightKg: measure({
    label: "El peso",
    min: 0.5,
    max: 30,
    unit: "kg",
    invalid: "Escribe el peso en kg, como 4,85.",
  }),
  lengthCm: measure({
    label: "La longitud",
    min: 25,
    max: 130,
    unit: "cm",
    invalid: "Escribe la longitud en cm, como 56,5.",
  }),
  headCircumferenceCm: measure({
    label: "El perímetro craneal",
    min: 20,
    max: 60,
    unit: "cm",
    invalid: "Escribe el perímetro craneal en cm, como 38,5.",
  }),
};

type Measures = {
  weightKg?: number;
  lengthCm?: number;
  headCircumferenceCm?: number;
};

function hasAnyMeasure(value: Measures): boolean {
  return (
    value.weightKg !== undefined ||
    value.lengthCm !== undefined ||
    value.headCircumferenceCm !== undefined
  );
}

function toWholeUnits(
  value: number | undefined,
  factor: number,
): number | undefined {
  return value === undefined ? undefined : Math.round(value * factor);
}

/**
 * Stored as integers with the unit in the name (decision 007): no floating
 * point in the database, rounded to the gram and the millimetre.
 */
function toStoredUnits<T extends Measures>({
  weightKg,
  lengthCm,
  headCircumferenceCm,
  ...rest
}: T): Omit<T, keyof Measures> & {
  weightGrams: number | undefined;
  lengthMm: number | undefined;
  headCircumferenceMm: number | undefined;
} {
  return {
    ...rest,
    weightGrams: toWholeUnits(weightKg, GRAMS_PER_KG),
    lengthMm: toWholeUnits(lengthCm, MM_PER_CM),
    headCircumferenceMm: toWholeUnits(headCircumferenceCm, MM_PER_CM),
  };
}

const ONE_MEASURE = {
  error: "Indica al menos una medida.",
  // Shown under the first field of the form.
  path: ["weightKg"],
};

/**
 * Schemas that read local times in the household `timeZone` (CLAUDE.md §2.5).
 * The return type is inferred: Zod's generics spelled out add noise, not
 * safety.
 */
export function growthMeasurementSchemas(timeZone: string) {
  return {
    createGrowthMeasurementSchema: z
      .object({
        id: recordId,
        babyId: recordId,
        measuredAt: localDateTime(timeZone),
        ...measureFields,
      })
      .refine(hasAnyMeasure, ONE_MEASURE)
      .transform(toStoredUnits),
    updateGrowthMeasurementSchema: z
      .object({
        id: recordId,
        measuredAt: localDateTime(timeZone),
        ...measureFields,
      })
      .refine(hasAnyMeasure, ONE_MEASURE)
      .transform(toStoredUnits),
  };
}

type GrowthMeasurementSchemas = ReturnType<typeof growthMeasurementSchemas>;

/** What the client sends (raw form values, in kg and cm). */
export type CreateGrowthMeasurementInput = z.input<
  GrowthMeasurementSchemas["createGrowthMeasurementSchema"]
>;
export type UpdateGrowthMeasurementInput = z.input<
  GrowthMeasurementSchemas["updateGrowthMeasurementSchema"]
>;

export const deleteGrowthMeasurementSchema = z.object({ id: recordId });
