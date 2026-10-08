import { Suspense, type ReactNode } from "react";

import { BottomNavLinks } from "@/components/layout/bottom-nav-links";
import { BottomNavList } from "@/components/layout/bottom-nav-list";

/**
 * Bottom navigation of the (tabs) layout (CLAUDE.md §4.2): fixed in the
 * thumb zone, centered in the mobile column and clear of the iOS home
 * indicator. It comes after <main> in the DOM, so screen readers reach the
 * content first.
 */
export function BottomNav(): ReactNode {
  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background pb-[env(safe-area-inset-bottom)]"
    >
      {/* With Cache Components, reading the active segment suspends below
          any unknown dynamic param; the same bar, with no tab marked, keeps
          the shell prerendered meanwhile. */}
      <Suspense fallback={<BottomNavList activeId={null} />}>
        <BottomNavLinks />
      </Suspense>
    </nav>
  );
}
