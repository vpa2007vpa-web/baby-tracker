import Link from "next/link";
import type { ReactNode } from "react";

import { RecordHistoryItem } from "@/components/shared/record-history-item";
import { buttonVariants } from "@/components/ui/button";
import { DIAPER_TYPE_ICONS } from "@/features/diapers/components/diaper-type-icons";
import { StoolSwatch } from "@/features/diapers/components/stool-swatch";
import {
  DIAPER_TYPE_LABELS,
  STOOL_COLOR_LABELS,
  STOOL_CONSISTENCY_LABELS,
} from "@/features/diapers/labels";
import type { DiaperChangeItem } from "@/features/diapers/queries";
import { authorLabel } from "@/lib/authors";
import { formatTime } from "@/lib/dates";
import { cn } from "@/lib/utils";

type DiaperHistoryProps = {
  diapers: readonly DiaperChangeItem[];
  /** Household zone: times read as the parents' wall clock (§2.5). */
  timeZone: string;
  viewerId: string;
  authorNames: Readonly<Record<string, string>>;
};

/** The diapers of one day, newest first; each row opens its edit screen. */
export function DiaperHistory({
  diapers,
  timeZone,
  viewerId,
  authorNames,
}: DiaperHistoryProps): ReactNode {
  return (
    <ol className="flex flex-col divide-y divide-border">
      {diapers.map((diaper) => (
        <li key={diaper.id}>
          <DiaperHistoryItem
            diaper={diaper}
            time={formatTime(diaper.occurredAt, timeZone)}
            author={authorLabel(diaper.createdById, viewerId, authorNames)}
          />
        </li>
      ))}
    </ol>
  );
}

function DiaperHistoryItem({
  diaper,
  time,
  author,
}: {
  diaper: DiaperChangeItem;
  time: string;
  author: string | null;
}): ReactNode {
  const Icon = DIAPER_TYPE_ICONS[diaper.type];
  const editHref = `/diapers/${diaper.id}/edit`;
  const stoolDetails = [
    diaper.stoolColor && STOOL_COLOR_LABELS[diaper.stoolColor],
    diaper.stoolConsistency &&
      STOOL_CONSISTENCY_LABELS[diaper.stoolConsistency],
  ].filter(Boolean);
  const needsDetails = diaper.type !== "WET" && stoolDetails.length === 0;

  return (
    <div className="flex flex-col pb-3">
      <RecordHistoryItem
        label={time}
        dateTime={diaper.occurredAt.toISOString()}
        icon={<Icon aria-hidden className="size-5 text-diapers" />}
        iconSurfaceClassName="bg-diapers-soft"
        title={DIAPER_TYPE_LABELS[diaper.type]}
        details={
          stoolDetails.length > 0 && (
            <>
              {diaper.stoolColor && (
                <StoolSwatch color={diaper.stoolColor} className="size-3.5" />
              )}
              {stoolDetails.join(" · ")}
            </>
          )
        }
        author={author}
        href={editHref}
      />
      {needsDetails && (
        <Link
          href={editHref}
          className={cn(
            buttonVariants({ variant: "outline" }),
            "ml-15 h-12 self-start px-4 text-base",
          )}
        >
          Añadir color y textura
        </Link>
      )}
    </div>
  );
}
