"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** visibilitychange and online often fire together: refresh once. */
const DEBOUNCE_MS = 300;

/**
 * Re-reads the server state when the app comes back to the foreground or
 * the network returns (CLAUDE.md §2.8). Mobile browsers freeze background
 * tabs: without this, a feeding the other parent started stays unseen until
 * a reload. Phase 4's RealtimeSync takes this over.
 */
export function RefreshOnFocus(): null {
  const router = useRouter();

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    function scheduleRefresh(): void {
      if (document.visibilityState !== "visible") return;
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => router.refresh(), DEBOUNCE_MS);
    }

    document.addEventListener("visibilitychange", scheduleRefresh);
    window.addEventListener("online", scheduleRefresh);
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("visibilitychange", scheduleRefresh);
      window.removeEventListener("online", scheduleRefresh);
    };
  }, [router]);

  return null;
}
