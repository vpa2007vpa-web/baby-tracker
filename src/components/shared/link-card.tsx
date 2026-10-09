import { ChevronRight, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type LinkCardProps = {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
  /** Module accent, e.g. "bg-growth-soft" and "text-growth" (CLAUDE.md §4.4). */
  iconSurfaceClassName?: string;
  iconClassName?: string;
};

/** A large tappable row that opens another screen (icon, title and hint). */
export function LinkCard({
  href,
  icon: Icon,
  title,
  description,
  iconSurfaceClassName,
  iconClassName,
}: LinkCardProps): ReactNode {
  return (
    <Link
      href={href}
      className="flex min-h-20 items-center gap-4 rounded-2xl border border-border bg-card p-4 transition-colors outline-none hover:bg-muted focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring"
    >
      <span
        className={cn(
          "flex size-12 shrink-0 items-center justify-center rounded-full bg-muted",
          iconSurfaceClassName,
        )}
      >
        <Icon aria-hidden className={cn("size-6", iconClassName)} />
      </span>
      <span className="flex flex-1 flex-col gap-0.5">
        <span className="text-base font-medium">{title}</span>
        <span className="text-sm text-muted-foreground">{description}</span>
      </span>
      <ChevronRight
        aria-hidden
        className="size-5 shrink-0 text-muted-foreground"
      />
    </Link>
  );
}
