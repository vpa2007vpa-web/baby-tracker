import { useEffect, useState } from "react";

/**
 * "Now" on the server's clock, repainted every `tickMs` (CLAUDE.md §2.4,
 * §2.5). The first render, on the server and at hydration, is the render's
 * own `serverNow`: the same markup on both sides, so no mismatch. After
 * that, this device's clock is corrected by how far it runs from the
 * server's, so both parents' phones agree. Re-measured on every refresh.
 */
export function useServerClock(serverNow: string, tickMs: number): number {
  const serverNowMs = Date.parse(serverNow);
  const [clock, setClock] = useState({ deviceNowMs: serverNowMs, skewMs: 0 });

  useEffect(() => {
    const skewMs = serverNowMs - Date.now();
    const intervalId = setInterval(() => {
      setClock({ deviceNowMs: Date.now(), skewMs });
    }, tickMs);
    return () => clearInterval(intervalId);
  }, [serverNowMs, tickMs]);

  return clock.deviceNowMs + clock.skewMs;
}
