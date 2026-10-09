const MINUTE_MS = 60_000;

type SleepStartInput = {
  /** The server clock: the only reference for a timer (decision 051). */
  now: Date;
  /** "Se durmió hace 10 min", counted on the server clock. */
  minutesAgo?: number;
  /** An explicit start, already converted from the household zone. */
  startedAt?: Date;
  /** End of the latest finished sleep, if any. */
  previousEndedAt?: Date | null;
};

/**
 * When a timer begins. Never ahead of the server clock (a phone running
 * fast), and never before the previous sleep ended: "hace 15 min" right
 * after a short wake-up would overlap it and count that stretch twice in
 * the day's total.
 */
export function resolveSleepStart({
  now,
  minutesAgo,
  startedAt,
  previousEndedAt,
}: SleepStartInput): Date {
  const requestedMs =
    minutesAgo !== undefined
      ? now.getTime() - minutesAgo * MINUTE_MS
      : (startedAt?.getTime() ?? now.getTime());
  const notBeforePreviousMs = Math.max(
    requestedMs,
    previousEndedAt?.getTime() ?? requestedMs,
  );
  return new Date(Math.min(notBeforePreviousMs, now.getTime()));
}
