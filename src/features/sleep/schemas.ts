import { z } from "zod";

import {
  checkSessionTimes,
  localDateTime,
  NOTES_MAX_LENGTH,
  optionalText,
  recordId,
} from "@/lib/record-fields";

const HOUR_MS = 60 * 60 * 1000;
/** A long night of a toddler fits; a forgotten timer typed by hand does not. */
const MAX_SLEEP_MS = 16 * HOUR_MS;

const checkSleepTimes = checkSessionTimes(
  MAX_SLEEP_MS,
  "Un sueño no puede durar más de 16 horas.",
);

/**
 * Schemas that read local times in the household `timeZone` (CLAUDE.md §2.5).
 * The return type is inferred: Zod's generics spelled out add noise, not
 * safety.
 */
export function sleepSessionSchemas(timeZone: string) {
  return {
    /** Timer start. Without a time the server clock is the reference. */
    startSleepSessionSchema: z.object({
      id: recordId,
      babyId: recordId,
      startedAt: localDateTime(timeZone).optional(),
    }),
    /** A finished sleep typed by hand. */
    createSleepSessionSchema: z
      .object({
        id: recordId,
        babyId: recordId,
        startedAt: localDateTime(timeZone),
        endedAt: localDateTime(timeZone),
        notes: optionalText(NOTES_MAX_LENGTH),
      })
      .superRefine(checkSleepTimes),
    /** Only finished sessions are editable: an active one can only stop. */
    updateSleepSessionSchema: z
      .object({
        id: recordId,
        startedAt: localDateTime(timeZone),
        endedAt: localDateTime(timeZone),
        notes: optionalText(NOTES_MAX_LENGTH),
      })
      .superRefine(checkSleepTimes),
  };
}

type SleepSessionSchemas = ReturnType<typeof sleepSessionSchemas>;

/** What the client sends (raw form values). */
export type StartSleepSessionInput = z.input<
  SleepSessionSchemas["startSleepSessionSchema"]
>;
export type CreateSleepSessionInput = z.input<
  SleepSessionSchemas["createSleepSessionSchema"]
>;
export type UpdateSleepSessionInput = z.input<
  SleepSessionSchemas["updateSleepSessionSchema"]
>;

/** Stopping takes no time: the server clock decides when it ended. */
export const stopSleepSessionSchema = z.object({ id: recordId });
export const deleteSleepSessionSchema = z.object({ id: recordId });
