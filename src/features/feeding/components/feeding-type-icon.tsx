import { Milk } from "lucide-react";
import type { ReactNode } from "react";

import type { FeedingType } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";

const BREAST_INITIALS = { BREAST_LEFT: "I", BREAST_RIGHT: "D" } as const;

/**
 * Bottle icon, or the breast's initial in a ring ("I" izquierdo, "D"
 * derecho). Decorative: always next to the feeding's label.
 */
export function FeedingTypeIcon({
  type,
  className,
}: {
  type: FeedingType;
  className?: string;
}): ReactNode {
  if (type === "BOTTLE") {
    return <Milk aria-hidden className={cn("size-6", className)} />;
  }
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex size-6 items-center justify-center rounded-full border-2 border-current text-xs font-bold",
        className,
      )}
    >
      {BREAST_INITIALS[type]}
    </span>
  );
}
