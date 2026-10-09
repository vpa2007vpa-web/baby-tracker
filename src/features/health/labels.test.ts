import { describe, expect, it } from "vitest";

import {
  DOSE_UNIT_LABELS,
  formatDose,
  formatDoseInput,
  formatDoseNumber,
  HEALTH_KIND_LABELS,
} from "@/features/health/labels";
import { DoseUnit, HealthRecordKind } from "@/generated/prisma/enums";

describe("labels", () => {
  it("names every kind and unit", () => {
    for (const kind of Object.values(HealthRecordKind)) {
      expect(HEALTH_KIND_LABELS[kind]).toBeTruthy();
    }
    for (const unit of Object.values(DoseUnit)) {
      expect(DOSE_UNIT_LABELS[unit]).toBeTruthy();
    }
  });
});

describe("formatDose", () => {
  it.each([
    [2.5, "ML", "2,5 ml"],
    [100, "MG", "100 mg"],
    [1, "DROPS", "1 gota"],
    [3, "DROPS", "3 gotas"],
    [1, "PUFFS", "1 inhalación"],
    [2, "PUFFS", "2 inhalaciones"],
    [0.25, "ML", "0,25 ml"],
  ] as const)("%s %s reads %s", (amount, unit, expected) => {
    expect(formatDose(amount, unit)).toBe(expected);
  });
});

describe("formatDoseInput", () => {
  it("writes a stored dose back with a decimal comma", () => {
    expect(formatDoseInput(2.5)).toBe("2,5");
    expect(formatDoseInput(100)).toBe("100");
    expect(formatDoseInput(null)).toBeUndefined();
  });
});

describe("formatDoseNumber", () => {
  it("reads as an ordinal", () => {
    expect(formatDoseNumber(1)).toBe("1.ª dosis");
    expect(formatDoseNumber(3)).toBe("3.ª dosis");
  });
});
