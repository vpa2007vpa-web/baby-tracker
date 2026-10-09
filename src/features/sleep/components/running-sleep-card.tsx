import { Moon, Square } from "lucide-react";
import type { ReactNode } from "react";

import { ElapsedTime } from "@/components/shared/elapsed-time";
import { Button } from "@/components/ui/button";
import { formatTime } from "@/lib/dates";

export type RunningSleep = {
  id: string;
  /** ISO, from the database. */
  startedAt: string;
  /** "Ana", "ti", or null for a former member. */
  startedBy: string | null;
};

type RunningSleepCardProps = {
  sleep: RunningSleep;
  serverNow: string;
  /** Household zone, for "desde las 14:05" (§2.5). */
  timeZone: string;
  isDisabled: boolean;
  onStop: () => void;
};

/** A sleep in progress, the same on both parents' phones (§2.4). */
export function RunningSleepCard({
  sleep,
  serverNow,
  timeZone,
  isDisabled,
  onStop,
}: RunningSleepCardProps): ReactNode {
  return (
    <section
      aria-label="Siesta en curso"
      className="flex flex-col gap-3 rounded-2xl bg-sleep-soft p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <p className="flex items-center gap-2 font-semibold">
          <Moon aria-hidden className="size-5 text-sleep" />
          Durmiendo
        </p>
        {sleep.startedBy && (
          <p className="text-sm">iniciada por {sleep.startedBy}</p>
        )}
      </div>
      <div className="flex flex-col items-center gap-1">
        <ElapsedTime
          key={sleep.id}
          startedAt={sleep.startedAt}
          serverNow={serverNow}
          className="text-5xl font-semibold"
        />
        <p className="text-sm">
          desde las{" "}
          <time dateTime={sleep.startedAt}>
            {formatTime(new Date(sleep.startedAt), timeZone)}
          </time>
        </p>
      </div>
      <Button
        type="button"
        size="lg"
        disabled={isDisabled}
        onClick={onStop}
        className="h-14 w-full text-base"
      >
        <Square aria-hidden className="size-5 fill-current" />
        Parar
      </Button>
    </section>
  );
}
