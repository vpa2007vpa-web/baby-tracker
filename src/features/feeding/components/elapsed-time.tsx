"use client";

import { useEffect, useState, type ReactNode } from "react";

import { elapsedMs, formatElapsed } from "@/lib/dates";
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
  const startedAtMs = Date.parse(startedAt);
  const serverNowMs = Date.parse(serverNow);
  // The first render, on the server and at hydration, uses the server's
  // "now": the same markup on both sides, so no mismatch and no flicker.
  const [clock, setClock] = useState({ deviceNowMs: serverNowMs, skewMs: 0 });

  useEffect(() => {
    // How far this device's clock runs behind the server's, so both
    // parents' phones show the same time. Re-measured on every refresh.
    const skewMs = serverNowMs - Date.now();
    const intervalId = setInterval(() => {
      setClock({ deviceNowMs: Date.now(), skewMs });
    }, 1000);
    return () => clearInterval(intervalId);
  }, [serverNowMs]);

  return (
    // role="timer" is not announced on every tick (aria-live off).
    <span
      role="timer"
      aria-live="off"
      className={cn("tabular-nums", className)}
    >
      {formatElapsed(elapsedMs(startedAtMs, clock.deviceNowMs, clock.skewMs))}
    </span>
  );
}
