"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { ConnectionIndicator } from "@/features/sync/components/connection-indicator";
import {
  type ChannelState,
  connectionStatus,
  createDebouncedRefresh,
  toChannelState,
} from "@/features/sync/service";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useOnlineStatus } from "@/lib/use-online-status";

/** A switch of breast sends two signals milliseconds apart: one refresh. */
const REFRESH_DEBOUNCE_MS = 300;

/**
 * Keeps both parents' screens in step (CLAUDE.md §2.8). It listens to the
 * household's private Broadcast channel, where every change of the baby's
 * records drops a signal (migration broadcast_household_changes), and
 * answers with router.refresh(): the Server Components re-read PostgreSQL.
 * The signal is never applied as data (decision 015).
 *
 * Mobile browsers close the WebSocket in the background, so coming back to
 * the foreground or back online refreshes and, if the channel is not
 * joined, joins it again. A join after the first one also refreshes, to
 * catch up on what was missed meanwhile.
 */
export function RealtimeSync({
  householdId,
}: {
  householdId: string;
}): ReactNode {
  const router = useRouter();
  const isOnline = useOnlineStatus();
  const [channelState, setChannelState] = useState<ChannelState>("connecting");

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const refresh = createDebouncedRefresh(
      () => router.refresh(),
      REFRESH_DEBOUNCE_MS,
    );
    let channel: RealtimeChannel | null = null;
    let hasJoined = false;
    let isDisposed = false;

    async function join(): Promise<void> {
      // Private channels authorize with the user's JWT against the
      // realtime.messages policy; supabase-js renews it afterwards.
      await supabase.realtime.setAuth();
      if (isDisposed) return;
      const current = supabase.channel(`household:${householdId}`, {
        config: { private: true },
      });
      channel = current;
      current
        .on("broadcast", { event: "change" }, () => refresh.schedule())
        .subscribe((status) => {
          // A replaced channel reporting its own closing.
          if (current !== channel) return;
          const next = toChannelState(status);
          setChannelState(next);
          if (next !== "joined") return;
          if (hasJoined) refresh.schedule();
          hasJoined = true;
        });
    }

    function startJoin(): void {
      // No token or no network: the indicator says so and the next resume
      // tries again.
      join().catch(() => setChannelState("errored"));
    }

    function rejoin(): void {
      const previous = channel;
      channel = null;
      if (previous) void supabase.removeChannel(previous);
      setChannelState("connecting");
      startJoin();
    }

    function resume(): void {
      if (document.visibilityState !== "visible") return;
      refresh.schedule();
      if (channel?.state !== "joined") rejoin();
    }

    document.addEventListener("visibilitychange", resume);
    window.addEventListener("online", resume);
    startJoin();
    return () => {
      isDisposed = true;
      refresh.cancel();
      document.removeEventListener("visibilitychange", resume);
      window.removeEventListener("online", resume);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [householdId, router]);

  return (
    <ConnectionIndicator
      status={connectionStatus({ channelState, isOnline })}
    />
  );
}
