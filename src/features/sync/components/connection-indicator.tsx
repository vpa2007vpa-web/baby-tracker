import { RefreshCw, WifiOff } from "lucide-react";
import type { ReactNode } from "react";

import type { ConnectionStatus } from "@/features/sync/service";

/**
 * A slim pill at the top, only while not online (CLAUDE.md §2.8, decision
 * D3). The status region is always in the DOM so screen readers announce
 * the change, and it never takes taps from the header beneath it.
 */
export function ConnectionIndicator({
  status,
}: {
  status: ConnectionStatus;
}): ReactNode {
  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-[calc(env(safe-area-inset-top)_+_0.25rem)]"
    >
      {status !== "online" && (
        <p className="flex items-center gap-2 rounded-full bg-foreground px-3 py-1 text-sm font-medium text-background shadow-sm">
          {status === "offline" ? (
            <>
              <WifiOff aria-hidden className="size-4" />
              Sin conexión. Conéctate para registrar.
            </>
          ) : (
            <>
              <RefreshCw
                aria-hidden
                className="size-4 motion-safe:animate-spin"
              />
              Reconectando…
            </>
          )}
        </p>
      )}
    </div>
  );
}
