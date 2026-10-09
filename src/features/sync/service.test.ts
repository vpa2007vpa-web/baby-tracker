import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  connectionStatus,
  createDebouncedRefresh,
  toChannelState,
} from "@/features/sync/service";

describe("toChannelState", () => {
  it.each([
    ["SUBSCRIBED", "joined"],
    ["TIMED_OUT", "errored"],
    ["CHANNEL_ERROR", "errored"],
    ["CLOSED", "closed"],
  ] as const)("maps %s to %s", (status, expected) => {
    expect(toChannelState(status)).toBe(expected);
  });
});

describe("connectionStatus", () => {
  it("is offline without network, whatever the channel says", () => {
    expect(connectionStatus({ channelState: "joined", isOnline: false })).toBe(
      "offline",
    );
  });

  it("is online while joining and once joined: no flash on load", () => {
    expect(
      connectionStatus({ channelState: "connecting", isOnline: true }),
    ).toBe("online");
    expect(connectionStatus({ channelState: "joined", isOnline: true })).toBe(
      "online",
    );
  });

  it("is reconnecting when the channel failed or closed", () => {
    expect(connectionStatus({ channelState: "errored", isOnline: true })).toBe(
      "reconnecting",
    );
    expect(connectionStatus({ channelState: "closed", isOnline: true })).toBe(
      "reconnecting",
    );
  });
});

describe("createDebouncedRefresh", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("refreshes once for a burst of signals", () => {
    const refresh = vi.fn();
    const debounced = createDebouncedRefresh(refresh, 300);

    debounced.schedule();
    vi.advanceTimersByTime(200);
    debounced.schedule();
    debounced.schedule();
    vi.advanceTimersByTime(299);
    expect(refresh).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("refreshes again for a later signal", () => {
    const refresh = vi.fn();
    const debounced = createDebouncedRefresh(refresh, 300);

    debounced.schedule();
    vi.advanceTimersByTime(300);
    debounced.schedule();
    vi.advanceTimersByTime(300);

    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it("never refreshes after being cancelled", () => {
    const refresh = vi.fn();
    const debounced = createDebouncedRefresh(refresh, 300);

    debounced.schedule();
    debounced.cancel();
    vi.advanceTimersByTime(1000);

    expect(refresh).not.toHaveBeenCalled();
  });
});
