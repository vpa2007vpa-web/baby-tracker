import { Moon } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { QUICK_SLEEP_START_MINUTES_AGO } from "@/features/sleep/labels";

type StartSleepButtonsProps = {
  isDisabled: boolean;
  /** No minutes: now. The server counts them on its own clock. */
  onStart: (minutesAgo?: number) => void;
};

/**
 * No sleep running: start it now, or a few minutes back, since the app is
 * often opened once the baby is already asleep (decision 062). Each late
 * start keeps its visible text in its accessible name ("Iniciar siesta
 * hace 5 min").
 */
export function StartSleepButtons({
  isDisabled,
  onStart,
}: StartSleepButtonsProps): ReactNode {
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={isDisabled}
        onClick={() => onStart()}
        className="flex h-16 items-center justify-center gap-2 rounded-2xl bg-sleep-soft text-lg font-semibold outline-none focus-visible:ring-[3px] focus-visible:ring-ring disabled:opacity-50"
      >
        <Moon aria-hidden className="size-6 text-sleep" />
        Iniciar siesta
      </button>
      <div
        role="group"
        aria-label="Se durmió antes"
        className="grid grid-cols-3 gap-2"
      >
        {QUICK_SLEEP_START_MINUTES_AGO.map((minutesAgo) => (
          <Button
            key={minutesAgo}
            type="button"
            variant="outline"
            disabled={isDisabled}
            onClick={() => onStart(minutesAgo)}
            className="h-12 text-base tabular-nums"
          >
            <span className="sr-only">Iniciar siesta </span>
            hace {minutesAgo} min
          </Button>
        ))}
      </div>
    </div>
  );
}
