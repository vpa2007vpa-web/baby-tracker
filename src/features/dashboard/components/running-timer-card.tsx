import { ChevronRight, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { ElapsedTime } from "@/components/shared/elapsed-time";
import { cn } from "@/lib/utils";

type RunningTimerCardProps = {
  id: string;
  /** The module that stops it: "/feeding" or "/sleep" (decision D2). */
  href: string;
  icon: LucideIcon;
  /** "Pecho izquierdo en curso", "Durmiendo". */
  title: string;
  /** ISO start from the database. */
  startedAt: string;
  serverNow: string;
  /** "Ana", "ti", or null for a former member. */
  startedBy: string | null;
  surfaceClassName: string;
  iconClassName: string;
};

/**
 * A timer running on either parent's phone, at a glance. Stopping happens
 * in its module, one tap away, so "Parar" lives in one place only.
 */
export function RunningTimerCard({
  id,
  href,
  icon: Icon,
  title,
  startedAt,
  serverNow,
  startedBy,
  surfaceClassName,
  iconClassName,
}: RunningTimerCardProps): ReactNode {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-4 rounded-2xl p-4 outline-none focus-visible:ring-[3px] focus-visible:ring-ring",
        surfaceClassName,
      )}
    >
      <Icon aria-hidden className={cn("size-6 shrink-0", iconClassName)} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="font-medium">{title}</span>
        <ElapsedTime
          key={id}
          startedAt={startedAt}
          serverNow={serverNow}
          className="text-3xl font-semibold"
        />
        {startedBy && <span className="text-sm">iniciada por {startedBy}</span>}
      </span>
      <ChevronRight aria-hidden className="size-5 shrink-0" />
    </Link>
  );
}
