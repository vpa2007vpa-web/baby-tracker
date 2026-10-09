import { ChevronRight, Milk } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { TimeAgo } from "@/components/shared/time-ago";

type LastFeedingCardProps = {
  /** "Pecho izquierdo · 15 min" (describeLastFeeding). */
  description: string;
  /** ISO start of the feeding. */
  startedAt: string;
  serverNow: string;
  /** "Ana", "ti", or null for a former member. */
  author: string | null;
  /** "pecho derecho", when no breast feeding is running. */
  nextBreast: string | null;
};

/**
 * The question asked most at night: how long since the last feeding, and
 * which breast comes next (README, phase 4). Opens the feeding history.
 */
export function LastFeedingCard({
  description,
  startedAt,
  serverNow,
  author,
  nextBreast,
}: LastFeedingCardProps): ReactNode {
  return (
    <Link
      href="/feeding"
      className="flex items-center gap-4 rounded-2xl bg-feeding-soft p-4 outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
    >
      <Milk aria-hidden className="size-6 shrink-0 text-feeding" />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-sm font-medium">Última toma</span>
        <TimeAgo
          instant={startedAt}
          serverNow={serverNow}
          className="block text-2xl font-semibold first-letter:uppercase"
        />
        <span>{description}</span>
        {author && <span className="text-sm">por {author}</span>}
        {nextBreast && (
          <span className="text-sm font-medium">Siguiente: {nextBreast}</span>
        )}
      </span>
      <ChevronRight aria-hidden className="size-5 shrink-0" />
    </Link>
  );
}
