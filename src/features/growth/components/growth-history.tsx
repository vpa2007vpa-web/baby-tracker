import { Ruler } from "lucide-react";
import type { ReactNode } from "react";

import { RecordHistoryItem } from "@/components/shared/record-history-item";
import {
  describeWeightChanges,
  formatLength,
  formatWeight,
} from "@/features/growth/labels";
import type { GrowthMeasurementItem } from "@/features/growth/queries";
import { authorLabel } from "@/lib/authors";
import { formatShortDate } from "@/lib/dates";

type GrowthHistoryProps = {
  /** Newest first. */
  measurements: readonly GrowthMeasurementItem[];
  now: Date;
  /** Household zone: dates read as the parents' calendar (§2.5). */
  timeZone: string;
  viewerId: string;
  authorNames: Readonly<Record<string, string>>;
};

/** "5,25 kg", then "Longitud 56,5 cm", "Perímetro 38,5 cm". */
function describeMeasures(measurement: GrowthMeasurementItem): string[] {
  return [
    measurement.weightGrams !== null && formatWeight(measurement.weightGrams),
    measurement.lengthMm !== null &&
      `Longitud ${formatLength(measurement.lengthMm)}`,
    measurement.headCircumferenceMm !== null &&
      `Perímetro ${formatLength(measurement.headCircumferenceMm)}`,
  ].filter((part) => part !== false);
}

/** Every measurement, newest first, with the weight change since the last. */
export function GrowthHistory({
  measurements,
  now,
  timeZone,
  viewerId,
  authorNames,
}: GrowthHistoryProps): ReactNode {
  const weightChanges = describeWeightChanges(measurements);

  return (
    <ol className="flex flex-col divide-y divide-border">
      {measurements.map((measurement) => {
        // The schema requires at least one measure.
        const [title = "", ...rest] = describeMeasures(measurement);
        const change = weightChanges.get(measurement.id);
        const details = [change, ...rest].filter(Boolean).join(" · ");
        return (
          <li key={measurement.id}>
            <RecordHistoryItem
              label={formatShortDate(measurement.measuredAt, now, timeZone)}
              labelClassName="w-16 leading-tight"
              dateTime={measurement.measuredAt.toISOString()}
              icon={<Ruler aria-hidden className="size-5 text-growth" />}
              iconSurfaceClassName="bg-growth-soft"
              title={title}
              details={details || null}
              author={authorLabel(
                measurement.createdById,
                viewerId,
                authorNames,
              )}
              href={`/growth/${measurement.id}/edit`}
            />
          </li>
        );
      })}
    </ol>
  );
}
