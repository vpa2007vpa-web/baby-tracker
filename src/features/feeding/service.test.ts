import { describe, expect, it } from "vitest";

import {
  getOppositeBreast,
  suggestNextBreast,
} from "@/features/feeding/service";

describe("getOppositeBreast", () => {
  it("swaps left and right", () => {
    expect(getOppositeBreast("BREAST_LEFT")).toBe("BREAST_RIGHT");
    expect(getOppositeBreast("BREAST_RIGHT")).toBe("BREAST_LEFT");
  });
});

describe("suggestNextBreast", () => {
  it("suggests the breast that was not used last", () => {
    expect(suggestNextBreast("BREAST_LEFT")).toBe("BREAST_RIGHT");
    expect(suggestNextBreast("BREAST_RIGHT")).toBe("BREAST_LEFT");
  });

  it("starts with the left one when there is no history", () => {
    expect(suggestNextBreast(null)).toBe("BREAST_LEFT");
  });
});
