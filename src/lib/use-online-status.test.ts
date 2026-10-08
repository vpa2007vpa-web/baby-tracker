import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getOnlineStatus,
  subscribeToOnlineStatus,
} from "@/lib/use-online-status";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("online status store", () => {
  it("reads the browser's connection flag", () => {
    vi.stubGlobal("navigator", { onLine: false });
    expect(getOnlineStatus()).toBe(false);
  });

  it("notifies on online and offline until unsubscribed", () => {
    const target = new EventTarget();
    vi.stubGlobal("window", target);
    const onChange = vi.fn();

    const unsubscribe = subscribeToOnlineStatus(onChange);
    target.dispatchEvent(new Event("offline"));
    target.dispatchEvent(new Event("online"));
    expect(onChange).toHaveBeenCalledTimes(2);

    unsubscribe();
    target.dispatchEvent(new Event("offline"));
    expect(onChange).toHaveBeenCalledTimes(2);
  });
});
