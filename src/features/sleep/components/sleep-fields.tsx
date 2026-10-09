"use client";

import type { ReactNode } from "react";
import { Controller, useFormContext } from "react-hook-form";

import { DateTimeField } from "@/components/shared/date-time-field";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import type { UpdateSleepSessionInput } from "@/features/sleep/schemas";

/** For applyFieldErrors: the server's fieldErrors these fields can show. */
export const SLEEP_FIELD_NAMES = ["startedAt", "endedAt", "notes"] as const;

/** Shared by the new and edit forms (FormProvider): a finished siesta. */
export function SleepFields({ timeZone }: { timeZone: string }): ReactNode {
  const { control } = useFormContext<UpdateSleepSessionInput>();

  return (
    <>
      <Controller
        name="startedAt"
        control={control}
        render={({ field, fieldState }) => (
          <DateTimeField
            label="Se durmió"
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
      <Controller
        name="endedAt"
        control={control}
        render={({ field, fieldState }) => (
          <DateTimeField
            label="Se despertó"
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
      <Controller
        name="notes"
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="sleep-notes">Notas (opcional)</FieldLabel>
            <Textarea
              {...field}
              id="sleep-notes"
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
