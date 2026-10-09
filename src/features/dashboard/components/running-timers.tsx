import { Milk, Moon } from "lucide-react";
import type { ReactNode } from "react";

import { RunningTimerCard } from "@/features/dashboard/components/running-timer-card";

export type RunningTimer = {
  id: string;
  /** ISO start from the database. */
  startedAt: string;
  startedBy: string | null;
};

type RunningTimersProps = {
  /** "Pecho izquierdo", or null when no breast feeding runs. */
  feeding: (RunningTimer & { label: string }) | null;
  sleep: RunningTimer | null;
  serverNow: string;
};

/** "En curso": the timers either parent started, each opening its module. */
export function RunningTimers({
  feeding,
  sleep,
  serverNow,
}: RunningTimersProps): ReactNode {
  if (!feeding && !sleep) return null;
  return (
    <section aria-labelledby="running-title" className="flex flex-col gap-3">
      <h2 id="running-title" className="text-lg font-semibold">
        En curso
      </h2>
      {feeding && (
        <RunningTimerCard
          id={feeding.id}
          href="/feeding"
          icon={Milk}
          title={`${feeding.label} en curso`}
          startedAt={feeding.startedAt}
          serverNow={serverNow}
          startedBy={feeding.startedBy}
          surfaceClassName="bg-feeding-soft"
          iconClassName="text-feeding"
        />
      )}
      {sleep && (
        <RunningTimerCard
          id={sleep.id}
          href="/sleep"
          icon={Moon}
          title="Durmiendo"
          startedAt={sleep.startedAt}
          serverNow={serverNow}
          startedBy={sleep.startedBy}
          surfaceClassName="bg-sleep-soft"
          iconClassName="text-sleep"
        />
      )}
    </section>
  );
}
