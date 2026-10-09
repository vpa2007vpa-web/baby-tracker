import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DayNavProps = {
  /** "Hoy", "Ayer" or "jue 1 oct" (formatDayLabel). */
  label: string;
  previousHref: string;
  /** Null on today: there is no future day to look at. */
  nextHref: string | null;
};

const ARROW = cn(buttonVariants({ variant: "ghost", size: "icon" }), "size-12");

/** Previous and next day as plain links: the day lives in `?day=` (§2.4). */
export function DayNav({
  label,
  previousHref,
  nextHref,
}: DayNavProps): ReactNode {
  return (
    <nav aria-label="Días" className="flex items-center justify-between">
      <Link href={previousHref} aria-label="Día anterior" className={ARROW}>
        <ChevronLeft aria-hidden className="size-6" />
      </Link>
      <p className="text-lg font-semibold">{label}</p>
      {nextHref ? (
        <Link href={nextHref} aria-label="Día siguiente" className={ARROW}>
          <ChevronRight aria-hidden className="size-6" />
        </Link>
      ) : (
        // Keeps the label centered when there is no next day.
        <span aria-hidden className="size-12" />
      )}
    </nav>
  );
}
