import { z } from "zod";

import { DoseUnit, HealthRecordKind } from "@/generated/prisma/enums";
import {
  formNumber,
  localDateTime,
  NOTES_MAX_LENGTH,
  optionalText,
  recordId,
} from "@/lib/record-fields";

const NAME_MAX_LENGTH = 80;
const MAX_DOSE_AMOUNT = 1000;
const SERIES_RANGE = "El número de dosis va de 1 a 10.";

const healthRecordFields = {
  kind: z.enum(HealthRecordKind, { error: "Elige vacuna o medicamento." }),
  name: z
    .string({ error: "Escribe el nombre." })
    .trim()
    .min(1, { error: "Escribe el nombre." })
    .max(NAME_MAX_LENGTH, {
      error: `Usa ${NAME_MAX_LENGTH} caracteres como máximo.`,
    }),
  // Float on purpose (2,5 ml): the one exception to integer measures.
  doseAmount: formNumber(
    z
      .number({ error: "Escribe la dosis con números, como 2,5." })
      .positive({ error: "La dosis debe ser mayor que 0." })
      .max(MAX_DOSE_AMOUNT, {
        error: "Revisa la dosis: parece demasiado alta.",
      })
      .optional(),
  ),
  doseUnit: z
    .enum(DoseUnit, { error: "Elige una unidad de la lista." })
    .optional(),
  // Position in a vaccine series (1st, 2nd… dose).
  doseNumber: formNumber(
    z
      .number({ error: "Escribe el número de dosis, como 2." })
      .int({ error: SERIES_RANGE })
      .min(1, { error: SERIES_RANGE })
      .max(10, { error: SERIES_RANGE })
      .optional(),
  ),
  reaction: optionalText(NOTES_MAX_LENGTH),
  notes: optionalText(NOTES_MAX_LENGTH),
};

type Dose = {
  kind: HealthRecordKind;
  doseAmount?: number;
  doseUnit?: DoseUnit;
  doseNumber?: number;
};

/** "5" alone is meaningless: 5 ml and 5 drops are very different doses. */
function checkDoseHasUnit(dose: Dose, ctx: z.RefinementCtx): void {
  if (dose.doseAmount !== undefined && dose.doseUnit === undefined) {
    ctx.addIssue({
      code: "custom",
      path: ["doseUnit"],
      message: "Elige la unidad de la dosis.",
    });
  }
  if (dose.doseUnit !== undefined && dose.doseAmount === undefined) {
    ctx.addIssue({
      code: "custom",
      path: ["doseAmount"],
      message: "Escribe la cantidad de la dosis.",
    });
  }
}

/**
 * Only vaccines come in a numbered series. A number left over after switching
 * the form to "Medicamento" is dropped instead of blocking the save.
 */
function dropSeriesNumberIfMedication<T extends Dose>(record: T): T {
  if (record.kind === "VACCINE") return record;
  return { ...record, doseNumber: undefined };
}

/**
 * Schemas that read local times in the household `timeZone` (CLAUDE.md §2.5).
 * The return type is inferred: Zod's generics spelled out add noise, not
 * safety.
 */
export function healthRecordSchemas(timeZone: string) {
  return {
    createHealthRecordSchema: z
      .object({
        id: recordId,
        babyId: recordId,
        administeredAt: localDateTime(timeZone),
        ...healthRecordFields,
      })
      .superRefine(checkDoseHasUnit)
      .transform(dropSeriesNumberIfMedication),
    updateHealthRecordSchema: z
      .object({
        id: recordId,
        administeredAt: localDateTime(timeZone),
        ...healthRecordFields,
      })
      .superRefine(checkDoseHasUnit)
      .transform(dropSeriesNumberIfMedication),
  };
}

type HealthRecordSchemas = ReturnType<typeof healthRecordSchemas>;

/** What the client sends (raw form values). */
export type CreateHealthRecordInput = z.input<
  HealthRecordSchemas["createHealthRecordSchema"]
>;
export type UpdateHealthRecordInput = z.input<
  HealthRecordSchemas["updateHealthRecordSchema"]
>;

export const deleteHealthRecordSchema = z.object({ id: recordId });
