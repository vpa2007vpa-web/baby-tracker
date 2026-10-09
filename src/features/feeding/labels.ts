import type { BottleContent, FeedingType } from "@/generated/prisma/enums";
import { formatDuration } from "@/lib/dates";

// Spanish UI texts of the feeding enums. Isomorphic and exhaustive: a new
// enum value fails to compile until it has a label.

export const FEEDING_TYPE_LABELS: Readonly<Record<FeedingType, string>> = {
  BREAST_LEFT: "Pecho izquierdo",
  BREAST_RIGHT: "Pecho derecho",
  BOTTLE: "Biberón",
};

/** For buttons, where space is short. */
export const FEEDING_TYPE_SHORT_LABELS: Readonly<Record<FeedingType, string>> =
  {
    BREAST_LEFT: "Pecho izq.",
    BREAST_RIGHT: "Pecho der.",
    BOTTLE: "Biberón",
  };

export const BOTTLE_CONTENT_LABELS: Readonly<Record<BottleContent, string>> = {
  BREAST_MILK: "Leche materna",
  FORMULA: "Fórmula",
};

/** The quick amounts of the bottle form (README, phase 3). */
export const QUICK_BOTTLE_AMOUNTS_ML: readonly number[] = [60, 90, 120, 150];

function plural(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

/**
 * "7 tomas · 4 de pecho (1 h 25 min) · 3 biberones (330 ml)". A kind of
 * feeding the day did not have is left out, except breast time that spilled
 * over from the day before.
 */
export function describeFeedingCounts(summary: {
  count: number;
  bottleCount: number;
  bottleMl: number;
  breastCount: number;
  breastMs: number;
}): string {
  const parts = [plural(summary.count, "toma", "tomas")];
  if (summary.breastCount > 0 || summary.breastMs > 0) {
    parts.push(
      `${summary.breastCount} de pecho (${formatDuration(summary.breastMs)})`,
    );
  }
  if (summary.bottleCount > 0) {
    parts.push(
      `${plural(summary.bottleCount, "biberón", "biberones")} (${summary.bottleMl} ml)`,
    );
  }
  return parts.join(" · ");
}
