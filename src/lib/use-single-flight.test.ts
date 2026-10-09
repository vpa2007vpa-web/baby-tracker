import { describe, expect, it } from "vitest";

import { createSingleFlightGate } from "@/lib/use-single-flight";

describe("createSingleFlightGate", () => {
  it("lets one task in and shuts out a second tap until it leaves", () => {
    const gate = createSingleFlightGate();

    expect(gate.tryEnter()).toBe(true);
    expect(gate.tryEnter()).toBe(false);

    gate.leave();
    expect(gate.tryEnter()).toBe(true);
  });
});
