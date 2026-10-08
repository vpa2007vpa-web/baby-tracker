import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  /** Usually the way to create the first record (CLAUDE.md §4.4). */
  action?: ReactNode;
  /** Module accent, e.g. "bg-feeding-soft" and "text-feeding". */
  iconSurfaceClassName?: string;
  iconClassName?: string;
};

/** What a screen shows before there is anything to list. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  iconSurfaceClassName,
  iconClassName,
}: EmptyStateProps): ReactNode {
  return (
    <section className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border px-6 py-10 text-center">
      <span
        className={cn(
          "flex size-14 items-center justify-center rounded-full bg-muted",
          iconSurfaceClassName,
        )}
      >
        <Icon aria-hidden className={cn("size-7", iconClassName)} />
      </span>
      <h2 className="text-lg font-semibold text-balance">{title}</h2>
      <p className="text-muted-foreground">{description}</p>
      {action}
    </section>
  );
}
