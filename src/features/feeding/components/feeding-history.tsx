import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

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
          <FeedingHistoryItem
            feeding={feeding}
            time={formatTime(feeding.startedAt, timeZone)}
            isFromPreviousDay={feeding.startedAt < day.start}
            author={authorLabel(feeding.createdById, viewerId, authorNames)}
          />
        </li>
      ))}
    </ol>
  );
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

function FeedingHistoryItem({
  feeding,
  time,
  isFromPreviousDay,
  author,
}: {
  feeding: FeedingItem;
  time: string;
  isFromPreviousDay: boolean;
  author: string | null;
}): ReactNode {
  // A running feeding is controlled from the bar, never edited (decision 051).
  const isRunning = feeding.type !== "BOTTLE" && feeding.endedAt === null;
  const content = (
    <>
      <time
        dateTime={feeding.startedAt.toISOString()}
        className="w-12 shrink-0 text-base font-semibold tabular-nums"
      >
        {time}
      </time>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-feeding-soft">
        <FeedingTypeIcon type={feeding.type} className="size-5 text-feeding" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-medium">{FEEDING_TYPE_LABELS[feeding.type]}</span>
        <span className="text-sm text-muted-foreground">
          {describeFeeding(feeding)}
          {isFromPreviousDay && " · desde el día anterior"}
        </span>
        {author && (
          <span className="text-sm text-muted-foreground">por {author}</span>
        )}
      </span>
    </>
  );

  if (isRunning) {
    return (
      <div className="flex min-h-12 items-center gap-3 py-3">{content}</div>
    );
  }
  return (
    <Link
      href={`/feeding/${feeding.id}/edit`}
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
