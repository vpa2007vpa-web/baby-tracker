import { z } from "zod";

import { BottleContent, FeedingType } from "@/generated/prisma/enums";
import {
  checkSessionTimes,
  formNumber,
  localDateTime,
  NOTES_MAX_LENGTH,
  optionalText,
  recordId,
} from "@/lib/record-fields";

const HOUR_MS = 60 * 60 * 1000;
const MAX_BREAST_FEEDING_MS = 2 * HOUR_MS;
const BOTTLE_RANGE = "El biberón va de 1 a 400 ml.";

const breastSide = z.enum([FeedingType.BREAST_LEFT, FeedingType.BREAST_RIGHT], {
  error: "Elige el pecho.",
});

const bottleFields = {
  type: z.literal(FeedingType.BOTTLE),
  amountMl: formNumber(
    z
      .number({ error: "Indica los ml del biberón." })
      .int({ error: "Usa ml enteros, como 90." })
      .min(1, { error: BOTTLE_RANGE })
      .max(400, { error: BOTTLE_RANGE }),
  ),
  bottleContent: z.enum(BottleContent, {
    error: "Elige leche materna o fórmula.",
  }),
  notes: optionalText(NOTES_MAX_LENGTH),
};

const checkBreastTimes = checkSessionTimes(
  MAX_BREAST_FEEDING_MS,
  "Una toma de pecho no puede durar más de 2 horas.",
);

const UNKNOWN_TYPE = { error: "Elige pecho o biberón." };

/**
 * Schemas that read local times in the household `timeZone` (CLAUDE.md §2.5).
 * A bottle is a point in time; a breast feeding has a start and an end (or
 * is a running timer). The return type is inferred: Zod's generics spelled
 * out add noise, not safety.
 */
export function feedingSchemas(timeZone: string) {
  const breastFields = {
    type: breastSide,
    startedAt: localDateTime(timeZone),
    endedAt: localDateTime(timeZone),
    notes: optionalText(NOTES_MAX_LENGTH),
  };

  return {
    /** Breast timer start. Without a time the server clock is the reference. */
    startFeedingSchema: z.object({
      id: recordId,
      babyId: recordId,
      type: breastSide,
      startedAt: localDateTime(timeZone).optional(),
    }),
    /** A bottle (one tap: no time means now) or a finished breast feeding. */
    createFeedingSchema: z.discriminatedUnion(
      "type",
      [
        z.object({
          id: recordId,
          babyId: recordId,
          startedAt: localDateTime(timeZone).optional(),
          ...bottleFields,
        }),
        z
          .object({ id: recordId, babyId: recordId, ...breastFields })
          .superRefine(checkBreastTimes),
      ],
      UNKNOWN_TYPE,
    ),
    /** Bottles and finished breast feedings: a running one can only stop. */
    updateFeedingSchema: z.discriminatedUnion(
      "type",
      [
        z.object({
          id: recordId,
          startedAt: localDateTime(timeZone),
          ...bottleFields,
        }),
        z
          .object({ id: recordId, ...breastFields })
          .superRefine(checkBreastTimes),
      ],
      UNKNOWN_TYPE,
    ),
  };
}

type FeedingSchemas = ReturnType<typeof feedingSchemas>;

/** What the client sends (raw form values). */
export type StartFeedingInput = z.input<FeedingSchemas["startFeedingSchema"]>;
export type CreateFeedingInput = z.input<FeedingSchemas["createFeedingSchema"]>;
export type UpdateFeedingInput = z.input<FeedingSchemas["updateFeedingSchema"]>;

/** Stopping takes no time: the server clock decides when it ended. */
export const stopFeedingSchema = z.object({ id: recordId });
/** Stops `activeId` and starts the other breast as `id`, atomically. */
export const switchFeedingSideSchema = z.object({
  activeId: recordId,
  id: recordId,
});
export const deleteFeedingSchema = z.object({ id: recordId });
