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

/** A timer started late covers a nap begun up to an hour ago. */
export const MAX_SLEEP_START_MINUTES_AGO = 60;

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
    /**
     * Timer start, on the server clock: now, `minutesAgo` ("se durmió hace
     * 10 min", counted by the server, so the phone's clock and the time
     * zone never shift it) or an explicit `startedAt`.
     */
    startSleepSessionSchema: z
      .object({
        id: recordId,
        babyId: recordId,
        startedAt: localDateTime(timeZone).optional(),
        minutesAgo: z
          .number({ error: "Elige cuánto hace que se durmió." })
          .int({ error: "Elige cuánto hace que se durmió." })
          .min(0, { error: "Elige cuánto hace que se durmió." })
          .max(MAX_SLEEP_START_MINUTES_AGO, {
            error: `Como mucho, hace ${MAX_SLEEP_START_MINUTES_AGO} minutos.`,
          })
          .optional(),
      })
      .refine(
        (start) =>
          start.startedAt === undefined || start.minutesAgo === undefined,
        {
          error: "Indica la hora o los minutos, no las dos.",
          path: ["minutesAgo"],
        },
      ),
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
