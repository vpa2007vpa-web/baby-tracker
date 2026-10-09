/**
 * A real clock skew is seconds (phones sync over NTP). A gap of minutes
 * means the render itself is old, so the device clock is trusted instead.
 */
export const MAX_TRUSTED_SKEW_MS = 2 * 60 * 1000;

const DEFAULT_CAPACITY = 32;

export type SkewRegistry = {
  /** Server clock minus device clock for the render made at `serverNow`. */
  skewFor: (serverNow: string, deviceNowMs: number) => number;
};

/**
 * Measures each render's skew once, the first time it is seen. Next.js keeps
 * visited screens alive with React's Activity: when one is shown again its
 * effects re-run with the same, now old, `serverNow`, and measuring again
 * would subtract the time spent away and freeze the clock at the old render.
 */
export function createSkewRegistry(
  capacity: number = DEFAULT_CAPACITY,
): SkewRegistry {
  const skews = new Map<string, number>();
  return {
    skewFor(serverNow, deviceNowMs) {
      const known = skews.get(serverNow);
      if (known !== undefined) return known;
      const measured = Date.parse(serverNow) - deviceNowMs;
      const skew = Math.abs(measured) <= MAX_TRUSTED_SKEW_MS ? measured : 0;
      skews.set(serverNow, skew);
      // Maps keep insertion order: the first key is the oldest render.
      if (skews.size > capacity) {
        const oldest = skews.keys().next();
        if (!oldest.done) skews.delete(oldest.value);
      }
      return skew;
    },
  };
}
