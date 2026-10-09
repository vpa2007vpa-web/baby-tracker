import type { ReactNode } from "react";

import type { StoolColor } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";

// Full class names: Tailwind only generates the classes it can read.
const SWATCH_CLASS: Readonly<Record<StoolColor, string>> = {
  YELLOW: "bg-stool-yellow",
  GREEN: "bg-stool-green",
  BROWN: "bg-stool-brown",
  ORANGE: "bg-stool-orange",
  BLACK: "bg-stool-black",
  RED: "bg-stool-red",
  PALE: "bg-stool-pale",
};

/** A dot of the stool color; decorative, so always shown with its name. */
export function StoolSwatch({
  color,
  className,
}: {
  color: StoolColor;
  className?: string;
}): ReactNode {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block size-5 shrink-0 rounded-full border border-foreground/30",
        SWATCH_CLASS[color],
        className,
      )}
    />
  );
}
