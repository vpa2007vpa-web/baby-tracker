import Link from "next/link";
import type { ReactNode } from "react";

import { NAV_ITEMS, type NavItemId } from "@/components/layout/nav-items";
import { cn } from "@/lib/utils";

/**
 * The five tabs. Presentational: the client wrapper passes the active tab,
 * and the Suspense fallback renders it with none. The active tab is told by
 * a filled indicator, a bolder label and aria-current, never by color alone
 * (CLAUDE.md §4.4).
 */
export function BottomNavList({
  activeId,
}: {
  activeId: NavItemId | null;
}): ReactNode {
  return (
    <ul className="mx-auto grid h-(--bottom-nav-height) max-w-md grid-cols-5">
      {NAV_ITEMS.map((item) => {
        const isActive = item.id === activeId;
        const Icon = item.icon;
        return (
          <li key={item.id} className="flex">
            {/* The whole cell is the tap target: about 72 × 64 px at 360 px. */}
            <Link
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 text-xs font-medium text-muted-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:ring-inset",
                isActive && "font-semibold text-foreground",
              )}
            >
              <span
                className={cn(
                  "flex h-8 w-14 items-center justify-center rounded-full",
                  isActive && item.activeIndicatorClass,
                )}
              >
                <Icon
                  aria-hidden
                  className={cn("size-6", isActive && item.activeIconClass)}
                />
              </span>
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
