// Pure pieces of RealtimeSync (CLAUDE.md §2.8): how the household channel
// is doing, what the connection indicator says, and the refresh debounce.

/** The channel as RealtimeSync tracks it, from join to failure. */
export type ChannelState = "connecting" | "joined" | "errored" | "closed";

/** What the connection indicator shows (decision D3). */
export type ConnectionStatus = "online" | "reconnecting" | "offline";

/** The statuses supabase-js reports to `channel.subscribe(callback)`. */
export type SubscribeStatus =
  "SUBSCRIBED" | "TIMED_OUT" | "CLOSED" | "CHANNEL_ERROR";

export function toChannelState(status: SubscribeStatus): ChannelState {
  switch (status) {
    case "SUBSCRIBED":
      return "joined";
    case "TIMED_OUT":
    case "CHANNEL_ERROR":
      return "errored";
    case "CLOSED":
      return "closed";
  }
}

/**
 * Offline wins: the network is gone, so recording is disabled anyway.
 * Joining counts as online, so the first load never flashes "Reconectando".
 */
export function connectionStatus({
  channelState,
  isOnline,
}: {
  channelState: ChannelState;
  isOnline: boolean;
}): ConnectionStatus {
  if (!isOnline) return "offline";
  return channelState === "errored" || channelState === "closed"
    ? "reconnecting"
    : "online";
}

export type DebouncedRefresh = { schedule: () => void; cancel: () => void };

/**
 * One refresh for a burst of signals: a feeding switched to the other breast
 * stops one row and inserts another, two signals a few milliseconds apart.
 */
export function createDebouncedRefresh(
  refresh: () => void,
  delayMs: number,
): DebouncedRefresh {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  return {
    schedule() {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(refresh, delayMs);
    },
    cancel() {
      clearTimeout(timeoutId);
      timeoutId = undefined;
    },
  };
}
