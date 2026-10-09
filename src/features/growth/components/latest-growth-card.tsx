import type { ReactNode } from "react";

import { formatLength, formatWeight } from "@/features/growth/labels";
import type { GrowthMeasurementItem } from "@/features/growth/queries";
import { formatShortDate } from "@/lib/dates";

type LatestGrowthCardProps = {
  /** The history, newest first. */
  measurements: readonly GrowthMeasurementItem[];
  now: Date;
  timeZone: string;
};

type Measure = {
  label: string;
  pick: (measurement: GrowthMeasurementItem) => number | null;
  format: (value: number) => string;
};

const MEASURES: readonly Measure[] = [
  { label: "Peso", pick: (m) => m.weightGrams, format: formatWeight },
  { label: "Longitud", pick: (m) => m.lengthMm, format: formatLength },
  {
    label: "Perímetro craneal",
    pick: (m) => m.headCircumferenceMm,
    format: formatLength,
  },
];

/**
 * The latest value of each measure, each with its own date: a check-up
 * often weighs the baby without measuring the length.
 */
export function LatestGrowthCard({
  measurements,
  now,
  timeZone,
}: LatestGrowthCardProps): ReactNode {
  return (
    <section
      aria-labelledby="latest-growth-title"
      className="flex flex-col gap-3 rounded-2xl bg-growth-soft p-4"
    >
      <h2 id="latest-growth-title" className="font-semibold">
        Últimas medidas
      </h2>
      <dl className="grid grid-cols-3 gap-2">
        {MEASURES.map(({ label, pick, format }) => {
          const latest = measurements.find((m) => pick(m) !== null);
          const value = latest ? pick(latest) : null;
          return (
            <div key={label} className="flex flex-col gap-0.5">
              <dt className="text-sm">{label}</dt>
              <dd className="text-xl font-semibold tabular-nums">
                {latest && value !== null ? format(value) : "—"}
              </dd>
              {latest && (
                <dd className="text-sm">
                  <time dateTime={latest.measuredAt.toISOString()}>
                    {formatShortDate(latest.measuredAt, now, timeZone)}
                  </time>
                </dd>
              )}
            </div>
          );
        })}
      </dl>
    </section>
  );
}
