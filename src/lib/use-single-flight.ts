import { useState, useTransition } from "react";

export type SingleFlightGate = { tryEnter: () => boolean; leave: () => void };

/** A plain flag, read and set synchronously within one event. */
export function createSingleFlightGate(): SingleFlightGate {
  let isBusy = false;
  return {
    tryEnter() {
      if (isBusy) return false;
      isBusy = true;
      return true;
    },
    leave() {
      isBusy = false;
    },
  };
}

/**
 * One action at a time for one-tap buttons (CLAUDE.md §2.4). Every tap gets
 * its own UUID, so the server's idempotency cannot tell a double tap from
 * two records: the gate shuts the second tap out synchronously, before React
 * re-renders the buttons with `isBusy` (which disables them).
 */
export function useSingleFlight(): {
  isBusy: boolean;
  run: (task: () => Promise<void>) => boolean;
} {
  const [gate] = useState(createSingleFlightGate);
  const [isBusy, setIsBusy] = useState(false);
  const [, startTransition] = useTransition();

  function run(task: () => Promise<void>): boolean {
    if (!gate.tryEnter()) return false;
    setIsBusy(true);
    startTransition(async () => {
      try {
        await task();
      } finally {
        gate.leave();
        setIsBusy(false);
      }
    });
    return true;
  }

  return { isBusy, run };
}
