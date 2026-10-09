import type { ReactNode } from "react";

import { RecordHistoryItem } from "@/components/shared/record-history-item";
import { FeedingTypeIcon } from "@/features/feeding/components/feeding-type-icon";
import {
  BOTTLE_CONTENT_LABELS,
  FEEDING_TYPE_LABELS,
} from "@/features/feeding/labels";
import type { FeedingItem } from "@/features/feeding/queries";
import { authorLabel } from "@/lib/authors";
import { type DayRange, formatDuration, formatTime } from "@/lib/dates";

type FeedingHistoryProps = {
  feedings: readonly FeedingItem[];
  day: DayRange;
  /** Household zone: times read as the parents' wall clock (§2.5). */
  timeZone: string;
  viewerId: string;
  authorNames: Readonly<Record<string, string>>;
};

/** The feedings of one day, newest first; finished ones open their edit screen. */
export function FeedingHistory({
  feedings,
  day,
  timeZone,
  viewerId,
  authorNames,
}: FeedingHistoryProps): ReactNode {
  return (
    <ol className="flex flex-col divide-y divide-border">
      {feedings.map((feeding) => (
        <li key={feeding.id}>
          <RecordHistoryItem
            label={formatTime(feeding.startedAt, timeZone)}
            dateTime={feeding.startedAt.toISOString()}
            icon={
              <FeedingTypeIcon
                type={feeding.type}
                className="size-5 text-feeding"
              />
            }
            iconSurfaceClassName="bg-feeding-soft"
            title={FEEDING_TYPE_LABELS[feeding.type]}
            details={`${describeFeeding(feeding)}${feeding.startedAt < day.start ? " · desde el día anterior" : ""}`}
            author={authorLabel(feeding.createdById, viewerId, authorNames)}
            // A running feeding is controlled from the bar, never edited
            // (decision 051).
            href={isRunning(feeding) ? null : `/feeding/${feeding.id}/edit`}
          />
        </li>
      ))}
    </ol>
  );
}

function isRunning(feeding: FeedingItem): boolean {
  return feeding.type !== "BOTTLE" && feeding.endedAt === null;
}

function describeFeeding(feeding: FeedingItem): string {
  if (feeding.type === "BOTTLE") {
    const content = feeding.bottleContent
      ? ` · ${BOTTLE_CONTENT_LABELS[feeding.bottleContent]}`
      : "";
    return `${feeding.amountMl ?? 0} ml${content}`;
  }
  if (!feeding.endedAt) return "En curso";
  return formatDuration(
    feeding.endedAt.getTime() - feeding.startedAt.getTime(),
  );
}
