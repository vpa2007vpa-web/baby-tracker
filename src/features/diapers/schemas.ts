import { z } from "zod";

import {
  DiaperType,
  StoolColor,
  StoolConsistency,
} from "@/generated/prisma/enums";
import {
  localDateTime,
  NOTES_MAX_LENGTH,
  optionalText,
  recordId,
} from "@/lib/record-fields";

const diaperFields = {
  type: z.enum(DiaperType, { error: "Elige el tipo de pañal." }),
  stoolColor: z
    .enum(StoolColor, { error: "Elige un color de la lista." })
    .optional(),
  stoolConsistency: z
    .enum(StoolConsistency, { error: "Elige una textura de la lista." })
    .optional(),
  notes: optionalText(NOTES_MAX_LENGTH),
};

type StoolDetails = {
  type: DiaperType;
  stoolColor?: StoolColor;
  stoolConsistency?: StoolConsistency;
};

/**
 * A wet diaper has no stool. Leftover details (the form kept them after
 * switching to "Mojado") are dropped instead of blocking a one-hand log.
 */
function dropStoolDetailsIfWet<T extends StoolDetails>(diaper: T): T {
  if (diaper.type !== "WET") return diaper;
  return { ...diaper, stoolColor: undefined, stoolConsistency: undefined };
}

/**
 * Schemas that read local times in the household `timeZone` (CLAUDE.md §2.5):
 * the server passes env.APP_TIMEZONE and pages hand the same zone to forms.
 * The return type is inferred: Zod's generics spelled out add noise, not
 * safety.
 */
export function diaperChangeSchemas(timeZone: string) {
  return {
    createDiaperChangeSchema: z
      .object({
        id: recordId,
        babyId: recordId,
        // Omitted by the one-tap buttons: the server records "now".
        occurredAt: localDateTime(timeZone).optional(),
        ...diaperFields,
      })
      .transform(dropStoolDetailsIfWet),
    updateDiaperChangeSchema: z
      .object({
        id: recordId,
        occurredAt: localDateTime(timeZone),
        ...diaperFields,
      })
      .transform(dropStoolDetailsIfWet),
  };
}

type DiaperChangeSchemas = ReturnType<typeof diaperChangeSchemas>;

/** What the client sends (raw form values). */
export type CreateDiaperChangeInput = z.input<
  DiaperChangeSchemas["createDiaperChangeSchema"]
>;
export type UpdateDiaperChangeInput = z.input<
  DiaperChangeSchemas["updateDiaperChangeSchema"]
>;

export const deleteDiaperChangeSchema = z.object({ id: recordId });
