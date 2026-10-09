import type { DiaperType } from "@/generated/prisma/enums";

// Pure diaper rules (CLAUDE.md §2.3): no database, testable in isolation.

export type DiaperCounts = { total: number; wet: number; dirty: number };

/** A mixed diaper is both wet and dirty, as paediatricians count them. */
export function countDiaperChanges(
  diapers: readonly { type: DiaperType }[],
): DiaperCounts {
  return {
    total: diapers.length,
    wet: diapers.filter(({ type }) => type === "WET" || type === "MIXED")
      .length,
    dirty: diapers.filter(({ type }) => type === "DIRTY" || type === "MIXED")
      .length,
  };
}
