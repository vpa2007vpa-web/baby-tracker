import { Star } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { FeedingTypeIcon } from "@/features/feeding/components/feeding-type-icon";
import { FEEDING_TYPE_SHORT_LABELS } from "@/features/feeding/labels";
import type { BreastSide } from "@/features/feeding/service";
import { cn } from "@/lib/utils";

const SIDES: readonly BreastSide[] = ["BREAST_LEFT", "BREAST_RIGHT"];

const TILE =
  "flex h-20 flex-col items-center justify-center gap-0.5 rounded-2xl border-2 text-base font-semibold outline-none focus-visible:ring-[3px] focus-visible:ring-ring";

type StartFeedingButtonsProps = {
  suggestedSide: BreastSide;
  isDisabled: boolean;
  onStart: (side: BreastSide) => void;
};

/**
 * No feeding running: start either breast with one tap, or log a bottle.
 * The suggested breast is told by a filled tile and the word "Sugerido",
 * which is part of its accessible name, never by color alone.
 */
export function StartFeedingButtons({
  suggestedSide,
  isDisabled,
  onStart,
}: StartFeedingButtonsProps): ReactNode {
  return (
    <div className="grid grid-cols-3 gap-2">
      {SIDES.map((side) => {
        const isSuggested = side === suggestedSide;
        return (
          <button
            key={side}
            type="button"
            disabled={isDisabled}
            onClick={() => onStart(side)}
            className={cn(
              TILE,
              "disabled:opacity-50",
              isSuggested
                ? "border-feeding bg-feeding-soft"
                : "border-border bg-card",
            )}
          >
            <FeedingTypeIcon type={side} className="text-feeding" />
            {FEEDING_TYPE_SHORT_LABELS[side]}
            {isSuggested && (
              <span className="flex items-center gap-1 text-xs font-medium">
                <Star aria-hidden className="size-3 fill-current" />
                Sugerido
              </span>
            )}
          </button>
        );
      })}
      <Link
        href="/feeding/new?type=BOTTLE"
        className={cn(TILE, "border-border bg-card")}
      >
        <FeedingTypeIcon type="BOTTLE" className="text-feeding" />
        {FEEDING_TYPE_SHORT_LABELS.BOTTLE}
      </Link>
    </div>
  );
}
