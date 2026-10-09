"use client";

import type { ReactNode } from "react";
import { Controller, useFormContext, useWatch } from "react-hook-form";

import { ChoiceGrid } from "@/components/shared/choice-grid";
import { TextField } from "@/components/shared/text-field";
import { DOSE_UNIT_LABELS, DOSE_UNITS } from "@/features/health/labels";
import type { UpdateHealthRecordInput } from "@/features/health/schemas";

// Optional unit: "Sin indicar" maps to undefined, as in the stool fields.
const NOT_GIVEN = "";
const NOT_GIVEN_OPTION = { value: NOT_GIVEN, label: "Sin indicar" } as const;

/**
 * Amount and unit together, since "5" alone means nothing (5 ml or 5
 * drops). Only a vaccine has a number in its series; the schema drops it
 * for a medication, so switching the kind never blocks the save.
 */
export function DoseFields(): ReactNode {
  const { control } = useFormContext<UpdateHealthRecordInput>();
  const kind = useWatch({ control, name: "kind" });

  return (
    <>
      <Controller
        name="doseAmount"
        control={control}
        render={({ field, fieldState }) => (
          <TextField
            label="Dosis (opcional)"
            description="Por ejemplo, 2,5."
            inputMode="decimal"
            autoComplete="off"
            name={field.name}
            value={field.value ?? ""}
            onChange={field.onChange}
            onBlur={field.onBlur}
            ref={field.ref}
            error={fieldState.error?.message}
          />
        )}
      />
      <Controller
        name="doseUnit"
        control={control}
        render={({ field, fieldState }) => (
          <ChoiceGrid
            legend="Unidad"
            name={field.name}
            columns={3}
            value={field.value ?? NOT_GIVEN}
            onChange={(value) =>
              field.onChange(value === NOT_GIVEN ? undefined : value)
            }
            error={fieldState.error?.message}
            options={[
              NOT_GIVEN_OPTION,
              ...DOSE_UNITS.map((value) => ({
                value,
                label: DOSE_UNIT_LABELS[value],
              })),
            ]}
          />
        )}
      />
      {kind === "VACCINE" && (
        <Controller
          name="doseNumber"
          control={control}
          render={({ field, fieldState }) => (
            <TextField
              label="Número de dosis (opcional)"
              description="Por ejemplo, 2 si es la segunda dosis."
              inputMode="numeric"
              autoComplete="off"
              name={field.name}
              value={field.value ?? ""}
              onChange={field.onChange}
              onBlur={field.onBlur}
              ref={field.ref}
              error={fieldState.error?.message}
            />
          )}
        />
      )}
    </>
  );
}
