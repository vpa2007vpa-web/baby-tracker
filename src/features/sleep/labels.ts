import { formatDuration } from "@/lib/dates";

// Spanish UI texts of the sleep module. "Siesta" is the unit for any
// session, night included, as in the server's messages; "de sueño" names
// the time, since "3 sueños" would read as dreams. No gendered words
// ("dormido"): the baby's sex is never asked (decision 046).

/** "Se durmió hace…": the quick late starts of the bar (decision 062). */
export const QUICK_SLEEP_START_MINUTES_AGO: readonly number[] = [5, 10, 15];

/**
 * "2 siestas · 3 h 10 min de sueño". A day with only the end of the night
 * before has no siesta of its own: just its time.
 */
export function describeSleepCounts(summary: {
  count: number;
  totalMs: number;
}): string {
  const time = `${formatDuration(summary.totalMs)} de sueño`;
  if (summary.count === 0) return time;
  const siestas = `${summary.count} ${summary.count === 1 ? "siesta" : "siestas"}`;
  return `${siestas} · ${time}`;
}
