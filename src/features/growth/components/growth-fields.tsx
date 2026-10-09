"use client";

import type { ReactNode } from "react";
import { Controller, useFormContext } from "react-hook-form";

import { DateTimeField } from "@/components/shared/date-time-field";
import { UnitField } from "@/components/shared/unit-field";
import type { UpdateGrowthMeasurementInput } from "@/features/growth/schemas";

/** For applyFieldErrors: the server's fieldErrors these fields can show. */
export const GROWTH_FIELD_NAMES = [
  "measuredAt",
  "weightKg",
  "lengthCm",
  "headCircumferenceCm",
] as const;

const MEASURE_FIELDS = [
  { name: "weightKg", label: "Peso", unit: "kg" },
  { name: "lengthCm", label: "Longitud", unit: "cm" },
  { name: "headCircumferenceCm", label: "Perímetro craneal", unit: "cm" },
] as const;

/**
 * Shared by the new and edit forms (FormProvider). Any measure may be left
 * empty, but not all three: the schema says so under the weight.
 */
export function GrowthFields({ timeZone }: { timeZone: string }): ReactNode {
  const { control } = useFormContext<UpdateGrowthMeasurementInput>();

  return (
    <>
      <Controller
        name="measuredAt"
        control={control}
        render={({ field, fieldState }) => (
          <DateTimeField
            label="Fecha y hora"
            name={field.name}
            value={field.value ?? ""}
            onChange={field.onChange}
            onBlur={field.onBlur}
            ref={field.ref}
            timeZone={timeZone}
            error={fieldState.error?.message}
          />
        )}
      />
      {MEASURE_FIELDS.map(({ name, label, unit }) => (
        <Controller
          key={name}
          name={name}
          control={control}
          render={({ field, fieldState }) => (
            <UnitField
              label={label}
              unit={unit}
              name={field.name}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              ref={field.ref}
              error={fieldState.error?.message}
            />
          )}
        />
      ))}
    </>
  );
}
