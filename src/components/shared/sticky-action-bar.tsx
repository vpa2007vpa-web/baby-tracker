"use client";

import { WifiOff } from "lucide-react";
import type { ReactNode } from "react";

import { useFocusRecovery } from "@/lib/use-focus-recovery";
import { useOnlineStatus } from "@/lib/use-online-status";

type StickyActionBarProps = {
  /** The controls can be used: not busy and online. */
  areControlsEnabled: boolean;
  /** Changes when an action swaps the controls (start ↔ stop). */
  swapKey?: unknown;
  children: ReactNode;
};

/**
 * A module's one-tap actions, sticky above the bottom bar in the thumb zone
 * (CLAUDE.md §4.2). data-sticky-actions lifts the toasts above it
 * (globals.css). Offline it says why its buttons are disabled (§2.8), and
 * focus survives a swap of its controls (decision 061).
 */
export function StickyActionBar({
  areControlsEnabled,
  swapKey = null,
  children,
}: StickyActionBarProps): ReactNode {
  const isOnline = useOnlineStatus();
  const focusRecovery = useFocusRecovery<HTMLDivElement>(
    areControlsEnabled,
    swapKey,
  );

  return (
    <div
      {...focusRecovery}
      data-sticky-actions
      className="sticky bottom-[calc(var(--bottom-nav-height)_+_env(safe-area-inset-bottom))] z-10 -mx-4 mt-auto flex flex-col gap-2 border-t border-border bg-background px-4 py-3"
    >
      {!isOnline && (
        <p
          role="status"
          className="flex items-center justify-center gap-2 text-sm text-muted-foreground"
        >
          <WifiOff aria-hidden className="size-5" />
          Sin conexión. Conéctate para registrar.
        </p>
      )}
      {children}
    </div>
  );
}
