import { useSyncExternalStore } from "react";

export function subscribeToOnlineStatus(onChange: () => void): () => void {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

export function getOnlineStatus(): boolean {
  return navigator.onLine;
}

// The server cannot know the device's network: assume online, so the first
// paint never shows a disabled form that flips on hydration.
function getServerOnlineStatus(): boolean {
  return true;
}

/**
 * Whether the browser reports a network connection. Writes are disabled
 * while offline (CLAUDE.md §2.8). `navigator.onLine` can be true behind a
 * captive portal, so it is an early hint, never a guarantee.
 */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(
    subscribeToOnlineStatus,
    getOnlineStatus,
    getServerOnlineStatus,
  );
}
