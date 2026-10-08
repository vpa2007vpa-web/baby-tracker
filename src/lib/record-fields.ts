import { z } from "zod";

import { parseDateTimeLocal } from "@/lib/dates";

// Isomorphic Zod building blocks shared by the record modules' schemas, so
// the browser and the server apply exactly the same rules (CLAUDE.md §3.4).

/** Phones and the server disagree by a few minutes; "Ahora" must still pass. */
export const FUTURE_TOLERANCE_MS = 5 * 60_000;

const MISSING_TIME_MESSAGE = "Indica la fecha y la hora.";

export type LocalDateTimeSchema = z.ZodPipe<
  z.ZodString,
  z.ZodTransform<Date, string>
>;

/**
 * An `<input type="datetime-local">` value ("2026-10-08T14:30") read as a
 * wall-clock time in the household `timeZone` (CLAUDE.md §2.5) and turned
 * into an instant. Rejects missing, impossible and future times.
 */
export function localDateTime(timeZone: string): LocalDateTimeSchema {
  return z.string({ error: MISSING_TIME_MESSAGE }).transform((value, ctx) => {
    const instant = parseDateTimeLocal(value, timeZone);
    if (!instant) {
      ctx.addIssue({ code: "custom", message: MISSING_TIME_MESSAGE });
      return z.NEVER;
    }
    if (instant.getTime() > Date.now() + FUTURE_TOLERANCE_MS) {
      ctx.addIssue({ code: "custom", message: "La hora no puede ser futura." });
      return z.NEVER;
    }
    return instant;
  });
}

type NumberInput = string | number | undefined;

/** A number schema that receives `number | undefined` (empty field). */
type NumberTarget = z.ZodType<number | undefined, number | undefined>;

export type FormNumberSchema<T extends NumberTarget> = z.ZodPipe<
  z.ZodPipe<
    z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>,
    z.ZodTransform<number | undefined, NumberInput>
  >,
  T
>;

function toNumber(value: NumberInput): number | undefined {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : Number(trimmed.replace(",", "."));
}

/**
 * A number typed in a form ("2,5") or sent by a quick button (120). An empty
 * field means "not given": `z.coerce.number()` would turn it into 0
 * (CLAUDE.md §3.4). `schema` decides whether the value is required.
 */
export function formNumber<T extends NumberTarget>(
  schema: T,
): FormNumberSchema<T> {
  return z
    .union([z.string(), z.number()])
    .optional()
    .transform(toNumber)
    .pipe(schema);
}

export type OptionalTextSchema = z.ZodPipe<
  z.ZodOptional<z.ZodString>,
  z.ZodTransform<string | undefined, string | undefined>
>;

/** Free text such as notes: trimmed, capped, and empty means "not given". */
export function optionalText(maxLength: number): OptionalTextSchema {
  return z
    .string()
    .trim()
    .max(maxLength, { error: `Usa ${maxLength} caracteres como máximo.` })
    .optional()
    .transform((value) => (value === "" ? undefined : value));
}

/** Notes on any record. */
export const NOTES_MAX_LENGTH = 500;
