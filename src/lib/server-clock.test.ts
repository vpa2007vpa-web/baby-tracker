import { describe, expect, it } from "vitest";

import { createSkewRegistry, MAX_TRUSTED_SKEW_MS } from "@/lib/server-clock";

const SERVER_NOW = "2026-10-09T10:00:00.000Z";
const SERVER_NOW_MS = Date.parse(SERVER_NOW);
const MINUTE_MS = 60_000;

describe("createSkewRegistry", () => {
  it("measures how far this device runs from the server on first sight", () => {
    const skews = createSkewRegistry();
    // The device clock runs 2 s ahead of the server's.
    expect(skews.skewFor(SERVER_NOW, SERVER_NOW_MS + 2000)).toBe(-2000);
  });

  it("keeps the first measurement when the same render is shown again", () => {
    // Activity hides "Hoy" and shows it 10 min later with the same props:
    // re-measuring would subtract those 10 min and freeze the clock.
    const skews = createSkewRegistry();
    skews.skewFor(SERVER_NOW, SERVER_NOW_MS + 2000);

    expect(skews.skewFor(SERVER_NOW, SERVER_NOW_MS + 10 * MINUTE_MS)).toBe(
      -2000,
    );
  });

  it("measures a new render anew", () => {
    const skews = createSkewRegistry();
    skews.skewFor(SERVER_NOW, SERVER_NOW_MS + 2000);
    const later = "2026-10-09T10:30:00.000Z";

    expect(skews.skewFor(later, Date.parse(later) - 500)).toBe(500);
  });

  it("trusts the device clock for a render already stale on first sight", () => {
    const skews = createSkewRegistry();
    expect(
      skews.skewFor(SERVER_NOW, SERVER_NOW_MS + MAX_TRUSTED_SKEW_MS + 1),
    ).toBe(0);
  });

  it("forgets old renders instead of growing forever", () => {
    const skews = createSkewRegistry(2);
    skews.skewFor(SERVER_NOW, SERVER_NOW_MS + 1000);
    skews.skewFor(
      "2026-10-09T10:01:00.000Z",
      Date.parse("2026-10-09T10:01:00.000Z"),
    );
    skews.skewFor(
      "2026-10-09T10:02:00.000Z",
      Date.parse("2026-10-09T10:02:00.000Z"),
    );

    // The first render was evicted: it is measured again.
    expect(skews.skewFor(SERVER_NOW, SERVER_NOW_MS + 3000)).toBe(-3000);
  });
});
