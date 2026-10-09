import { useEffect, useState } from "react";

import { createSkewRegistry } from "@/lib/server-clock";

// One per browser tab: every timer of a render shares its measured skew.
const skews = createSkewRegistry();

/**
 * "Now" on the server's clock, repainted every `tickMs` (CLAUDE.md §2.4,
 * §2.5). The first render, on the server and at hydration, is the render's
 * own `serverNow`: the same markup on both sides, so no mismatch. After
 * that, this device's clock is corrected by how far it runs from the
 * server's (measured once per render, see createSkewRegistry), so both
 * parents' phones agree.
 */
export function useServerClock(serverNow: string, tickMs: number): number {
  const [nowMs, setNowMs] = useState(() => Date.parse(serverNow));

  useEffect(() => {
    const skewMs = skews.skewFor(serverNow, Date.now());
    const tick = (): void => setNowMs(Date.now() + skewMs);
    // Shown again by Activity, the screen still holds its last value:
    // repaint right away instead of a whole tick later.
    const firstTickId = setTimeout(tick, 0);
    const intervalId = setInterval(tick, tickMs);
    return () => {
      clearTimeout(firstTickId);
      clearInterval(intervalId);
    };
  }, [serverNow, tickMs]);

  return nowMs;
}
