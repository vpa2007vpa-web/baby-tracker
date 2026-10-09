"use client";

import type { ReactNode } from "react";
import { Controller, useFormContext } from "react-hook-form";

import { ChoiceGrid } from "@/components/shared/choice-grid";
import type { DiaperFieldValues } from "@/features/diapers/components/diaper-fields";
import { StoolSwatch } from "@/features/diapers/components/stool-swatch";
import {
  STOOL_COLOR_LABELS,
  STOOL_COLOR_ORDER,
  STOOL_CONSISTENCY_LABELS,
  STOOL_CONSISTENCY_ORDER,
} from "@/features/diapers/labels";

// Optional details: "Sin indicar" maps to undefined, which the schema and
// the database store as "not given".
const NOT_GIVEN = "";
const NOT_GIVEN_OPTION = { value: NOT_GIVEN, label: "Sin indicar" } as const;

/** Stool color (swatch + name, never color alone) and consistency. */
export function StoolFields(): ReactNode {
  const { control } = useFormContext<DiaperFieldValues>();

  return (
    <>
      <Controller
        name="stoolColor"
        control={control}
        render={({ field, fieldState }) => (
          <ChoiceGrid
            legend="Color"
            name={field.name}
            value={field.value ?? NOT_GIVEN}
            onChange={(value) =>
              field.onChange(value === NOT_GIVEN ? undefined : value)
            }
            error={fieldState.error?.message}
            options={[
              NOT_GIVEN_OPTION,
              ...STOOL_COLOR_ORDER.map((value) => ({
                value,
                label: STOOL_COLOR_LABELS[value],
                visual: <StoolSwatch color={value} />,
              })),
            ]}
          />
        )}
      />
      <Controller
        name="stoolConsistency"
        control={control}
        render={({ field, fieldState }) => (
          <ChoiceGrid
            legend="Textura"
            name={field.name}
            value={field.value ?? NOT_GIVEN}
            onChange={(value) =>
              field.onChange(value === NOT_GIVEN ? undefined : value)
            }
            error={fieldState.error?.message}
            options={[
              NOT_GIVEN_OPTION,
              ...STOOL_CONSISTENCY_ORDER.map((value) => ({
                value,
                label: STOOL_CONSISTENCY_LABELS[value],
              })),
            ]}
          />
        )}
      />
    </>
  );
}
