import type { ReactNode } from "react";

/**
 * A form's actions, pinned to the bottom of the screen in the thumb zone
 * (CLAUDE.md §4.2). The negative bottom margin cancels the page container's
 * `pb-[max(1rem,env(safe-area-inset-bottom))]`, so the footer carries the
 * iOS safe area itself when it sticks over scrolled content.
 */
export function FormFooter({ children }: { children: ReactNode }): ReactNode {
  return (
    <div className="sticky bottom-0 -mx-4 mt-auto -mb-[max(1rem,env(safe-area-inset-bottom))] flex flex-col gap-3 bg-background px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
      {children}
    </div>
  );
}
