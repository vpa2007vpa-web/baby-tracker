import type { FeedingType } from "@/generated/prisma/enums";

// Pure feeding rules (CLAUDE.md §2.3): no database, testable in isolation.

export type BreastSide = Exclude<FeedingType, "BOTTLE">;

export function getOppositeBreast(side: BreastSide): BreastSide {
  return side === "BREAST_LEFT" ? "BREAST_RIGHT" : "BREAST_LEFT";
}

/**
 * The next breast to offer: the one not used last, so both are emptied in
 * turn. Without any breast feeding yet, the left one.
 */
export function suggestNextBreast(lastSide: BreastSide | null): BreastSide {
  return lastSide ? getOppositeBreast(lastSide) : "BREAST_LEFT";
}
