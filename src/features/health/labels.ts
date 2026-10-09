import type { DoseUnit, HealthRecordKind } from "@/generated/prisma/enums";

// Spanish UI texts of the health module. Isomorphic and exhaustive: a new
// enum value fails to compile until it has a label.

export const HEALTH_KIND_LABELS: Readonly<Record<HealthRecordKind, string>> = {
  VACCINE: "Vacuna",
  MEDICATION: "Medicamento",
};

/** As read after an amount: "2,5 ml", "3 gotas". */
export const DOSE_UNIT_LABELS: Readonly<Record<DoseUnit, string>> = {
  ML: "ml",
  MG: "mg",
  DROPS: "gotas",
  PUFFS: "inhalaciones",
};

const DOSE_UNIT_SINGULAR: Readonly<Record<DoseUnit, string>> = {
  ML: "ml",
  MG: "mg",
  DROPS: "gota",
  PUFFS: "inhalación",
};

/** The unit choices of the form, in the order a parent reaches for them. */
export const DOSE_UNITS: readonly DoseUnit[] = ["ML", "DROPS", "MG", "PUFFS"];

const DOSE = new Intl.NumberFormat("es-ES", {
  maximumFractionDigits: 2,
  useGrouping: false,
});

/** "2,5 ml", "1 gota", "2 inhalaciones". */
export function formatDose(amount: number, unit: DoseUnit): string {
  const units = amount === 1 ? DOSE_UNIT_SINGULAR : DOSE_UNIT_LABELS;
  return `${DOSE.format(amount)} ${units[unit]}`;
}

/** Edit form value of a stored dose: 2.5 → "2,5". */
export function formatDoseInput(amount: number | null): string | undefined {
  return amount === null ? undefined : DOSE.format(amount);
}

/** Position in a vaccine series: "2.ª dosis". */
export function formatDoseNumber(doseNumber: number): string {
  return `${doseNumber}.ª dosis`;
}
