import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type RecordHistoryItemProps = {
  /** "14:05" in a day's history, "12 oct" in a full one. */
  label: string;
  /** ISO instant of the record, for <time dateTime>. */
  dateTime: string;
  /** Decorative icon, already sized and colored with the module token. */
  icon: ReactNode;
  /** The module's soft surface behind the icon, e.g. "bg-sleep-soft". */
  iconSurfaceClassName: string;
  title: ReactNode;
  details?: ReactNode;
  /** "Ana", "ti", or null when nobody is known (decision 057). */
  author: string | null;
  /** Its edit screen, or null when it cannot be edited (a running timer). */
  href: string | null;
  /** Wider column for dates instead of times. */
  labelClassName?: string;
};

/**
 * One row of a module's history (CLAUDE.md §4.4): when, what, details and
 * who logged it, opening its edit screen. Authorship stays discreet.
 */
export function RecordHistoryItem({
  label,
  dateTime,
  icon,
  iconSurfaceClassName,
  title,
  details,
  author,
  href,
  labelClassName,
}: RecordHistoryItemProps): ReactNode {
  const content = (
    <>
      <time
        dateTime={dateTime}
        className={cn(
          "w-12 shrink-0 text-base font-semibold tabular-nums",
          labelClassName,
        )}
      >
        {label}
      </time>
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-full",
          iconSurfaceClassName,
        )}
      >
        {icon}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-medium">{title}</span>
        {details && (
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            {details}
          </span>
        )}
        {author && (
          <span className="text-sm text-muted-foreground">por {author}</span>
        )}
      </span>
    </>
  );

  if (!href) {
    return (
      <div className="flex min-h-12 items-center gap-3 py-3">{content}</div>
    );
  }
  return (
    <Link
      href={href}
      className="flex min-h-12 items-center gap-3 rounded-xl py-3 outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
    >
      {content}
      <span className="sr-only">Editar</span>
      <ChevronRight
        aria-hidden
        className="size-5 shrink-0 text-muted-foreground"
      />
    </Link>
  );
}
