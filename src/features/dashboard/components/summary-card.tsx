import { ChevronRight, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import type { SummaryCardText } from "@/features/dashboard/labels";
import { cn } from "@/lib/utils";

type SummaryCardProps = {
  href: string;
  icon: LucideIcon;
  /** The module's name, as in the bottom bar: "Tomas". */
  title: string;
  text: SummaryCardText;
  /** Module accent, e.g. "bg-feeding-soft" and "text-feeding" (§4.4). */
  iconSurfaceClassName: string;
  iconClassName: string;
};

/**
 * One module's day at a glance, opening its history: a big figure with
 * tabular digits and up to two detail lines (CLAUDE.md §4.4).
 */
export function SummaryCard({
  href,
  icon: Icon,
  title,
  text,
  iconSurfaceClassName,
  iconClassName,
}: SummaryCardProps): ReactNode {
  return (
    <Link
      href={href}
      className="flex min-h-20 items-center gap-4 rounded-2xl border border-border bg-card p-4 transition-colors outline-none hover:bg-muted focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring"
    >
      <span
        className={cn(
          "flex size-12 shrink-0 items-center justify-center rounded-full",
          iconSurfaceClassName,
        )}
      >
        <Icon aria-hidden className={cn("size-6", iconClassName)} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-sm font-medium">{title}</span>
        <span className="flex flex-wrap items-baseline gap-x-1.5">
          <span className="text-3xl font-semibold tabular-nums">
            {text.value}
          </span>
          <span className="text-base">{text.unit}</span>
        </span>
        {text.details.map((detail) => (
          <span key={detail} className="text-sm text-muted-foreground">
            {detail}
          </span>
        ))}
      </span>
      <ChevronRight
        aria-hidden
        className="size-5 shrink-0 text-muted-foreground"
      />
    </Link>
  );
}
