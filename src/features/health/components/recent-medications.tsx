"use client";

import { Repeat } from "lucide-react";
import type { ReactNode } from "react";
import { useFormContext, useWatch } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { formatDose, formatDoseInput } from "@/features/health/labels";
import type { CreateHealthRecordInput } from "@/features/health/schemas";
import type { DoseUnit } from "@/generated/prisma/enums";

export type RecentMedicationOption = {
  name: string;
  doseAmount: number | null;
  doseUnit: DoseUnit | null;
};

/**
 * One tap repeats a recent medication: name, dose and unit of its last
 * time (CLAUDE.md §4.2, like the last bottle). Only on "Medicamento".
 */
export function RecentMedications({
  medications,
}: {
  medications: readonly RecentMedicationOption[];
}): ReactNode {
  const { control, setValue } = useFormContext<CreateHealthRecordInput>();
  const kind = useWatch({ control, name: "kind" });
  if (kind !== "MEDICATION" || medications.length === 0) return null;

  function repeat(medication: RecentMedicationOption): void {
    const options = { shouldDirty: true, shouldValidate: false } as const;
    setValue("name", medication.name, options);
    setValue("doseAmount", formatDoseInput(medication.doseAmount), options);
    setValue("doseUnit", medication.doseUnit ?? undefined, options);
  }

  return (
    <div
      role="group"
      aria-labelledby="recent-medications-title"
      className="flex flex-col gap-2"
    >
      <p id="recent-medications-title" className="text-sm font-medium">
        Repetir uno reciente
      </p>
      <div className="flex flex-col gap-2">
        {medications.map((medication) => (
          <Button
            key={medication.name}
            type="button"
            variant="outline"
            onClick={() => repeat(medication)}
            className="h-12 justify-start text-base"
          >
            <Repeat aria-hidden className="size-5" />
            <span className="truncate">
              {medication.name}
              {medication.doseAmount !== null &&
                medication.doseUnit !== null &&
                ` · ${formatDose(medication.doseAmount, medication.doseUnit)}`}
            </span>
          </Button>
        ))}
      </div>
    </div>
  );
}
