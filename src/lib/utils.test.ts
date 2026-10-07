import { describe, expect, it } from "vitest";

import { cn } from "@/lib/utils";

describe("cn", () => {
  it("lets the last conflicting Tailwind class win", () => {
    expect(cn("h-12 px-2", "px-4")).toBe("h-12 px-4");
  });

  it("drops falsy values", () => {
    const isActive = false;
    expect(cn("text-base", isActive && "font-bold", undefined)).toBe(
      "text-base",
    );
  });
});
