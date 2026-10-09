import { Moon } from "lucide-react";
import type { ReactNode } from "react";

import { RecordHistoryItem } from "@/components/shared/record-history-item";
import type { SleepSessionItem } from "@/features/sleep/queries";
import { authorLabel } from "@/lib/authors";
import { type DayRange, formatDuration, formatTime } from "@/lib/dates";

type SleepHistoryProps = {
  sessions: readonly SleepSessionItem[];
  day: DayRange;
  /** Household zone: times read as the parents' wall clock (§2.5). */
  timeZone: string;
  viewerId: string;
  authorNames: Readonly<Record<string, string>>;
};

/**
 * The siestas that overlap one day, newest first: a night across midnight
 * shows on both days (decision 053). Finished ones open their edit screen.
 */
export function SleepHistory({
  sessions,
  day,
  timeZone,
  viewerId,
  authorNames,
}: SleepHistoryProps): ReactNode {
  return (
    <ol className="flex flex-col divide-y divide-border">
      {sessions.map((session) => (
        <li key={session.id}>
          <RecordHistoryItem
            label={formatTime(session.startedAt, timeZone)}
            dateTime={session.startedAt.toISOString()}
            icon={<Moon aria-hidden className="size-5 text-sleep" />}
            iconSurfaceClassName="bg-sleep-soft"
            title={
              session.endedAt
                ? formatDuration(
                    session.endedAt.getTime() - session.startedAt.getTime(),
                  )
                : "En curso"
            }
            details={describeEnd(session, day, timeZone)}
            author={authorLabel(session.createdById, viewerId, authorNames)}
            // A running siesta is stopped from the bar, never edited
            // (decision 051).
            href={session.endedAt ? `/sleep/${session.id}/edit` : null}
          />
        </li>
      ))}
    </ol>
  );
}

/** "hasta las 07:10 del día siguiente · desde el día anterior". */
function describeEnd(
  session: SleepSessionItem,
  day: DayRange,
  timeZone: string,
): string | null {
  const parts: string[] = [];
  if (session.endedAt) {
    const nextDay = session.endedAt >= day.end ? " del día siguiente" : "";
    parts.push(`hasta las ${formatTime(session.endedAt, timeZone)}${nextDay}`);
  }
  if (session.startedAt < day.start) parts.push("desde el día anterior");
  return parts.length > 0 ? parts.join(" · ") : null;
}
