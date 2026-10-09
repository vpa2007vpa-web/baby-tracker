import { TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

import { RecordHistoryItem } from "@/components/shared/record-history-item";
import { HealthKindIcon } from "@/features/health/components/health-kind-icon";
import {
  formatDose,
  formatDoseNumber,
  HEALTH_KIND_LABELS,
} from "@/features/health/labels";
import type { HealthRecordItem } from "@/features/health/queries";
import { authorLabel } from "@/lib/authors";
import { formatShortDate, formatTime } from "@/lib/dates";

type HealthHistoryProps = {
  /** Newest first. */
  records: readonly HealthRecordItem[];
  now: Date;
  /** Household zone: dates and times as the parents' wall clock (§2.5). */
  timeZone: string;
  viewerId: string;
  authorNames: Readonly<Record<string, string>>;
};

/** "Vacuna · 2.ª dosis · 10:30" or "Medicamento · 2,5 ml · 21:15". */
function describeRecord(record: HealthRecordItem, timeZone: string): string {
  return [
    HEALTH_KIND_LABELS[record.kind],
    record.doseAmount !== null &&
      record.doseUnit !== null &&
      formatDose(record.doseAmount, record.doseUnit),
    record.doseNumber !== null && formatDoseNumber(record.doseNumber),
    formatTime(record.administeredAt, timeZone),
  ]
    .filter((part) => part !== false)
    .join(" · ");
}

/** Vaccines and medications together, newest first, reactions marked. */
export function HealthHistory({
  records,
  now,
  timeZone,
  viewerId,
  authorNames,
}: HealthHistoryProps): ReactNode {
  return (
    <ol className="flex flex-col divide-y divide-border">
      {records.map((record) => (
        <li key={record.id}>
          <RecordHistoryItem
            label={formatShortDate(record.administeredAt, now, timeZone)}
            labelClassName="w-16 leading-tight"
            dateTime={record.administeredAt.toISOString()}
            icon={<HealthKindIcon kind={record.kind} className="text-health" />}
            iconSurfaceClassName="bg-health-soft"
            title={record.name}
            details={describeRecord(record, timeZone)}
            // Told by the icon and the word, never by color alone (§4.4).
            note={
              record.reaction && (
                <>
                  <TriangleAlert
                    aria-hidden
                    className="mt-0.5 size-4 shrink-0 text-health"
                  />
                  <span className="line-clamp-2">
                    Reacción: {record.reaction}
                  </span>
                </>
              )
            }
            author={authorLabel(record.createdById, viewerId, authorNames)}
            href={`/health/${record.id}/edit`}
          />
        </li>
      ))}
    </ol>
  );
}
