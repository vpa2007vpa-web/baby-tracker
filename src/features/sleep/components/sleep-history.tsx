import { ChevronRight, Moon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

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
          <SleepHistoryItem
            session={session}
            time={formatTime(session.startedAt, timeZone)}
            details={describeEnd(session, day, timeZone)}
            author={authorLabel(session.createdById, viewerId, authorNames)}
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

function SleepHistoryItem({
  session,
  time,
  details,
  author,
}: {
  session: SleepSessionItem;
  time: string;
  details: string | null;
  author: string | null;
}): ReactNode {
  const content = (
    <>
      <time
        dateTime={session.startedAt.toISOString()}
        className="w-12 shrink-0 text-base font-semibold tabular-nums"
      >
        {time}
      </time>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-sleep-soft">
        <Moon aria-hidden className="size-5 text-sleep" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-medium">
          {session.endedAt
            ? formatDuration(
                session.endedAt.getTime() - session.startedAt.getTime(),
              )
            : "En curso"}
        </span>
        {details && (
          <span className="text-sm text-muted-foreground">{details}</span>
        )}
        {author && (
          <span className="text-sm text-muted-foreground">por {author}</span>
        )}
      </span>
    </>
  );

  // A running siesta is stopped from the bar, never edited (decision 051).
  if (!session.endedAt) {
    return (
      <div className="flex min-h-12 items-center gap-3 py-3">{content}</div>
    );
  }
  return (
    <Link
      href={`/sleep/${session.id}/edit`}
      className="flex min-h-12 items-center gap-3 rounded-xl py-3 outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
    >
      {content}
      <span className="sr-only">Editar</span>
      <ChevronRight
        aria-hidden
        className="size-5 shrink-0 text-muted-foreground"
      />
    </Link>
  );
}
