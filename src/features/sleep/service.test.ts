import { describe, expect, it } from "vitest";

import { resolveSleepStart } from "@/features/sleep/service";

const NOW = new Date("2026-10-09T14:00:30Z");

function minutesBefore(minutes: number): Date {
  return new Date(NOW.getTime() - minutes * 60_000);
}

describe("resolveSleepStart", () => {
  it("starts now when no time is given", () => {
    expect(resolveSleepStart({ now: NOW })).toEqual(NOW);
  });

  it("goes back exactly the minutes asked, to the second", () => {
    expect(resolveSleepStart({ now: NOW, minutesAgo: 15 })).toEqual(
      minutesBefore(15),
    );
  });

  it("keeps an explicit past start", () => {
    expect(
      resolveSleepStart({ now: NOW, startedAt: minutesBefore(40) }),
    ).toEqual(minutesBefore(40));
  });

  it("clamps a start ahead of the server clock to now", () => {
    expect(
      resolveSleepStart({ now: NOW, startedAt: minutesBefore(-3) }),
    ).toEqual(NOW);
  });

  it("never starts before the previous sleep ended", () => {
    expect(
      resolveSleepStart({
        now: NOW,
        minutesAgo: 15,
        previousEndedAt: minutesBefore(4),
      }),
    ).toEqual(minutesBefore(4));
  });

  it("ignores a previous sleep that ended before the asked start", () => {
    expect(
      resolveSleepStart({
        now: NOW,
        minutesAgo: 10,
        previousEndedAt: minutesBefore(30),
      }),
    ).toEqual(minutesBefore(10));
  });

  it("never starts in the future because of a previous end", () => {
    expect(
      resolveSleepStart({
        now: NOW,
        minutesAgo: 5,
        previousEndedAt: minutesBefore(-1),
      }),
    ).toEqual(NOW);
  });
});
