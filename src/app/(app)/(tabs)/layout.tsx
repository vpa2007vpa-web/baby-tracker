import type { ReactNode } from "react";

import { BottomNav } from "@/components/layout/bottom-nav";

// Screens with the bottom bar: the five tabs and the screens reached from
// Más. Forms and other single tasks live in (task), without it. Static on
// purpose: every page checks the session itself (CLAUDE.md §2.2), so this
// shell renders instantly. The top padding clears the iOS status bar of the
// installed PWA (viewport-fit=cover); the bottom one, the bar and the home
// indicator.
export default function TabsLayout({ children }: LayoutProps<"/">): ReactNode {
  return (
    <>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pt-[calc(env(safe-area-inset-top)_+_1.5rem)] pb-[calc(var(--bottom-nav-height)_+_env(safe-area-inset-bottom)_+_1.5rem)]">
        {children}
      </main>
      <BottomNav />
    </>
  );
}
