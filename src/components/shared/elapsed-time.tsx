"use client";

import type { ReactNode } from "react";

import { elapsedMs, formatElapsed } from "@/lib/dates";
import { useServerClock } from "@/lib/use-server-clock";
import { cn } from "@/lib/utils";

type ElapsedTimeProps = {
  /** ISO start stored in the database: the timer's only source of truth. */
  startedAt: string;
  /** ISO "now" of the server render, to measure this device's clock skew. */
  serverNow: string;
  className?: string;
};

/**
 * A running timer, repainted every second (CLAUDE.md §2.4). Remount it with
 * `key` when the session changes.
 */
export function ElapsedTime({
  startedAt,
  serverNow,
  className,
}: ElapsedTimeProps): ReactNode {
  const nowMs = useServerClock(serverNow, 1000);

  return (
    // role="timer" is not announced on every tick (aria-live off).
    <span
      role="timer"
      aria-live="off"
      className={cn("tabular-nums", className)}
    >
      {formatElapsed(elapsedMs(Date.parse(startedAt), nowMs, 0))}
    </span>
  );
}
