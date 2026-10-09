"use client";

import type { ReactNode } from "react";
import { Controller, useFormContext, useWatch } from "react-hook-form";

import { ChoiceGrid } from "@/components/shared/choice-grid";
import { DateTimeField } from "@/components/shared/date-time-field";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { BottleFields } from "@/features/feeding/components/bottle-fields";
import { FeedingTypeIcon } from "@/features/feeding/components/feeding-type-icon";
import { FEEDING_TYPE_SHORT_LABELS } from "@/features/feeding/labels";
import type { UpdateFeedingInput } from "@/features/feeding/schemas";
import type { FeedingType } from "@/generated/prisma/enums";

/** For applyFieldErrors: the server's fieldErrors these fields can show. */
export const FEEDING_FIELD_NAMES = [
  "type",
  "startedAt",
  "endedAt",
  "amountMl",
  "bottleContent",
  "notes",
] as const;

const FEEDING_TYPES: readonly FeedingType[] = [
  "BREAST_LEFT",
  "BREAST_RIGHT",
  "BOTTLE",
];

/**
 * Shared by the new and edit forms (FormProvider). The type decides the
 * fields: a bottle has an amount, a milk and a time; a breast feeding typed
 * by hand, a start and an end. The schema (a discriminated union) drops the
 * other type's values, so switching the type back and forth is harmless.
 */
export function FeedingFields({ timeZone }: { timeZone: string }): ReactNode {
  const { control } = useFormContext<UpdateFeedingInput>();
  const type = useWatch({ control, name: "type" });
  const isBottle = type === "BOTTLE";

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
            options={FEEDING_TYPES.map((value) => ({
              value,
              label: FEEDING_TYPE_SHORT_LABELS[value],
              visual: (
                <FeedingTypeIcon
                  type={value}
                  className="size-5 shrink-0 text-feeding"
                />
              ),
            }))}
          />
        )}
      />
      {isBottle && <BottleFields />}
      <Controller
        name="startedAt"
        control={control}
        render={({ field, fieldState }) => (
          <DateTimeField
            label={isBottle ? "Hora" : "Inicio"}
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
      {!isBottle && (
        <Controller
          name="endedAt"
          control={control}
          render={({ field, fieldState }) => (
            <DateTimeField
              label="Fin"
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
      )}
      <Controller
        name="notes"
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="feeding-notes">Notas (opcional)</FieldLabel>
            <Textarea
              {...field}
              id="feeding-notes"
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
