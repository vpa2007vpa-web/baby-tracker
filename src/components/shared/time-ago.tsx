"use client";

import type { ReactNode } from "react";

import { formatTimeAgo } from "@/lib/dates";
import { useServerClock } from "@/lib/use-server-clock";

/** Minutes are the finest unit shown: each change shows within 10 s. */
const TICK_MS = 10_000;

type TimeAgoProps = {
  /** ISO instant from the database. */
  instant: string;
  /** ISO "now" of the server render, for the first paint and the skew. */
  serverNow: string;
  className?: string;
};

/**
 * "hace 25 min" that stays true while the screen is open (CLAUDE.md §2.5):
 * a relative time drawn on the server would freeze, and drawn only in the
 * browser it would mismatch at hydration.
 */
export function TimeAgo({
  instant,
  serverNow,
  className,
}: TimeAgoProps): ReactNode {
  const nowMs = useServerClock(serverNow, TICK_MS);

  return (
    <time dateTime={instant} className={className}>
      {formatTimeAgo(new Date(instant), new Date(nowMs))}
    </time>
  );
}
