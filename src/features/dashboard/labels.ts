import type { DailySummary } from "@/features/dashboard/service";
import { formatDuration } from "@/lib/dates";

// Spanish texts of the "Hoy" summary cards: a big value, its unit and up
// to two detail lines. Same words as each module's history ("siesta",
// "de sueño", no gendered words: decision 062).

export type SummaryCardText = {
  /** The big figure, with tabular digits. */
  value: string;
  /** Left empty when the value carries its own unit ("5,25 kg"). */
  unit: string;
  details: string[];
};

function plural(count: number, singular: string, pluralForm: string): string {
  return count === 1 ? singular : pluralForm;
}

/** "7 tomas", "4 de pecho · 1 h 25 min", "3 biberones · 330 ml". */
export function describeFeedingTotals(
  feedings: DailySummary["feedings"],
): SummaryCardText {
  const details: string[] = [];
  // Breast time that spilled over from the night before counts too.
  if (feedings.breastCount > 0 || feedings.breastMs > 0) {
    details.push(
      `${feedings.breastCount} de pecho · ${formatDuration(feedings.breastMs)}`,
    );
  }
  if (feedings.bottleCount > 0) {
    details.push(
      `${feedings.bottleCount} ${plural(feedings.bottleCount, "biberón", "biberones")} · ${feedings.bottleMl} ml`,
    );
  }
  return {
    value: String(feedings.count),
    unit: plural(feedings.count, "toma", "tomas"),
    details,
  };
}

/** "6 pañales", "5 mojados · 3 sucios" (a mixed one counts in both). */
export function describeDiaperTotals(
  diapers: DailySummary["diapers"],
): SummaryCardText {
  return {
    value: String(diapers.total),
    unit: plural(diapers.total, "pañal", "pañales"),
    details:
      diapers.total === 0
        ? []
        : [
            `${diapers.wet} ${plural(diapers.wet, "mojado", "mojados")} · ${diapers.dirty} ${plural(diapers.dirty, "sucio", "sucios")}`,
          ],
  };
}

/** "9 h 40 min de sueño", "3 siestas". */
export function describeSleepTotals(
  sleep: DailySummary["sleep"],
): SummaryCardText {
  return {
    value: formatDuration(sleep.totalMs),
    unit: "de sueño",
    details:
      sleep.count === 0
        ? []
        : [`${sleep.count} ${plural(sleep.count, "siesta", "siestas")}`],
  };
}
