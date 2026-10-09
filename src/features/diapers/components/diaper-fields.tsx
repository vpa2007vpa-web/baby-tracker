"use client";

import type { ReactNode } from "react";
import { Controller, useFormContext, useWatch } from "react-hook-form";

import { ChoiceGrid } from "@/components/shared/choice-grid";
import { DateTimeField } from "@/components/shared/date-time-field";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { DIAPER_TYPE_ICONS } from "@/features/diapers/components/diaper-type-icons";
import { StoolFields } from "@/features/diapers/components/stool-fields";
import { DIAPER_TYPE_LABELS } from "@/features/diapers/labels";
import type { UpdateDiaperChangeInput } from "@/features/diapers/schemas";
import type { DiaperType } from "@/generated/prisma/enums";

/** The visible fields shared by the new and edit forms (raw form values). */
export type DiaperFieldValues = Pick<
  UpdateDiaperChangeInput,
  "type" | "occurredAt" | "stoolColor" | "stoolConsistency" | "notes"
>;

const DIAPER_TYPES: readonly DiaperType[] = ["WET", "DIRTY", "MIXED"];

/**
 * Type, time, stool details (hidden for a wet diaper, as the schema drops
 * them) and notes. Reads the form from FormProvider, so both forms share it.
 */
export function DiaperFields({ timeZone }: { timeZone: string }): ReactNode {
  const { control } = useFormContext<DiaperFieldValues>();
  const type = useWatch({ control, name: "type" });

  return (
    <>
      <Controller
        name="type"
        control={control}
        render={({ field, fieldState }) => (
          <ChoiceGrid
            legend="Tipo"
            name={field.name}
            columns={3}
            value={field.value}
            onChange={field.onChange}
            error={fieldState.error?.message}
            options={DIAPER_TYPES.map((value) => {
              const Icon = DIAPER_TYPE_ICONS[value];
              return {
                value,
                label: DIAPER_TYPE_LABELS[value],
                visual: (
                  <Icon aria-hidden className="size-5 shrink-0 text-diapers" />
                ),
              };
            })}
          />
        )}
      />
      <Controller
        name="occurredAt"
        control={control}
        render={({ field, fieldState }) => (
          <DateTimeField
            label="Hora"
            name={field.name}
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            ref={field.ref}
            timeZone={timeZone}
            error={fieldState.error?.message}
          />
        )}
      />
      {type !== "WET" && <StoolFields />}
      <Controller
        name="notes"
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="diaper-notes">Notas (opcional)</FieldLabel>
            <Textarea
              {...field}
              id="diaper-notes"
              value={field.value ?? ""}
              aria-invalid={fieldState.invalid}
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
    </>
  );
}
