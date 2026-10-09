import { Square } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { ElapsedTime } from "@/components/shared/elapsed-time";
import { FeedingTypeIcon } from "@/features/feeding/components/feeding-type-icon";
import { FEEDING_TYPE_LABELS } from "@/features/feeding/labels";
import type { BreastSide } from "@/features/feeding/service";

export type RunningFeeding = {
  id: string;
  type: BreastSide;
  /** ISO, from the database. */
  startedAt: string;
  /** "Ana", "ti", or null for a former member. */
  startedBy: string | null;
};

type RunningFeedingCardProps = {
  feeding: RunningFeeding;
  serverNow: string;
  isDisabled: boolean;
  onSwitch: () => void;
  onStop: () => void;
};

/** A feeding in progress, the same on both parents' phones (§2.4). */
export function RunningFeedingCard({
  feeding,
  serverNow,
  isDisabled,
  onSwitch,
  onStop,
}: RunningFeedingCardProps): ReactNode {
  return (
    <section
      aria-label="Toma en curso"
      className="flex flex-col gap-3 rounded-2xl bg-feeding-soft p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <p className="flex items-center gap-2 font-semibold">
          <FeedingTypeIcon type={feeding.type} className="text-feeding" />
          {FEEDING_TYPE_LABELS[feeding.type]}
        </p>
        {feeding.startedBy && (
          <p className="text-sm">iniciada por {feeding.startedBy}</p>
        )}
      </div>
      <ElapsedTime
        key={feeding.id}
        startedAt={feeding.startedAt}
        serverNow={serverNow}
        className="text-center text-5xl font-semibold"
      />
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          size="lg"
          disabled={isDisabled}
          onClick={onSwitch}
          className="h-14 text-base"
        >
          Cambiar de pecho
        </Button>
        <Button
          type="button"
          size="lg"
          disabled={isDisabled}
          onClick={onStop}
          className="h-14 text-base"
        >
          <Square aria-hidden className="size-5 fill-current" />
          Parar
        </Button>
      </div>
    </section>
  );
}
