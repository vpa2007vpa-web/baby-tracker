// Spanish UI texts of the growth module. Stored in grams and millimetres
// (decision 007), shown in kg and cm with a decimal comma (decision 052).

const DAY_MS = 24 * 60 * 60 * 1000;
const GRAMS_PER_KG = 1000;
const MM_PER_CM = 10;
/** U+2212, the minus of "−5 min" (decision 058). */
const MINUS = "−";

function decimal(maximumFractionDigits: number): Intl.NumberFormat {
  return new Intl.NumberFormat("es-ES", {
    maximumFractionDigits,
    useGrouping: false,
  });
}

const KG = decimal(3);
const CM = decimal(1);
const KG_CHANGE = decimal(2);

/** "5,25 kg". */
export function formatWeight(grams: number): string {
  return `${KG.format(grams / GRAMS_PER_KG)} kg`;
}

/** "56,5 cm", for length and head circumference. */
export function formatLength(mm: number): string {
  return `${CM.format(mm / MM_PER_CM)} cm`;
}

export const GROWTH_FACTORS = { kg: GRAMS_PER_KG, cm: MM_PER_CM } as const;

/** Edit form value of a stored measure: 4850 g → "4,85" (kg). */
export function toFormDecimal(
  value: number | null,
  factor: number,
): string | undefined {
  return value === null ? undefined : KG.format(value / factor);
}

function describeAmount(deltaGrams: number): string {
  if (deltaGrams === 0) return "Sin cambios";
  const sign = deltaGrams > 0 ? "+" : MINUS;
  const grams = Math.abs(deltaGrams);
  return grams >= GRAMS_PER_KG
    ? `${sign}${KG_CHANGE.format(grams / GRAMS_PER_KG)} kg`
    : `${sign}${grams} g`;
}

function describeSpan(days: number): string {
  if (days === 0) return "el mismo día";
  return days === 1 ? "en 1 día" : `en ${days} días`;
}

type WeighedMeasurement = {
  id: string;
  measuredAt: Date;
  weightGrams: number | null;
};

/**
 * "+350 g en 14 días" for each measurement with a weight, against the
 * previous weighed one (measurements without a weight are skipped). Takes
 * the history newest first; the oldest weight has no change.
 */
export function describeWeightChanges(
  measurements: readonly WeighedMeasurement[],
): Map<string, string> {
  const weighed = measurements.flatMap((measurement) =>
    measurement.weightGrams === null
      ? []
      : [{ ...measurement, weightGrams: measurement.weightGrams }],
  );
  const changes = new Map<string, string>();
  weighed.forEach((current, index) => {
    const previous = weighed[index + 1];
    if (!previous) return;
    const days = Math.round(
      (current.measuredAt.getTime() - previous.measuredAt.getTime()) / DAY_MS,
    );
    changes.set(
      current.id,
      `${describeAmount(current.weightGrams - previous.weightGrams)} ${describeSpan(days)}`,
    );
  });
  return changes;
}
