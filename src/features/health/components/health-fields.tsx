"use client";

import type { ReactNode } from "react";
import { Controller, useFormContext } from "react-hook-form";

import { ChoiceGrid } from "@/components/shared/choice-grid";
import { DateTimeField } from "@/components/shared/date-time-field";
import { TextField } from "@/components/shared/text-field";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { DoseFields } from "@/features/health/components/dose-fields";
import { HealthKindIcon } from "@/features/health/components/health-kind-icon";
import { HEALTH_KIND_LABELS } from "@/features/health/labels";
import type { UpdateHealthRecordInput } from "@/features/health/schemas";
import type { HealthRecordKind } from "@/generated/prisma/enums";

/** For applyFieldErrors: the server's fieldErrors these fields can show. */
export const HEALTH_FIELD_NAMES = [
  "kind",
  "name",
  "doseAmount",
  "doseUnit",
  "doseNumber",
  "administeredAt",
  "reaction",
  "notes",
] as const;

const KINDS: readonly HealthRecordKind[] = ["VACCINE", "MEDICATION"];

const TEXT_AREAS = [
  {
    name: "reaction",
    id: "health-reaction",
    label: "Reacción (opcional)",
  },
  { name: "notes", id: "health-notes", label: "Notas (opcional)" },
] as const;

/**
 * Shared by the new and edit forms (FormProvider). `children` goes right
 * after the kind: the new form's recent medications.
 */
export function HealthFields({
  timeZone,
  children,
}: {
  timeZone: string;
  children?: ReactNode;
}): ReactNode {
  const { control } = useFormContext<UpdateHealthRecordInput>();

  return (
    <>
      <Controller
        name="kind"
        control={control}
        render={({ field, fieldState }) => (
          <ChoiceGrid
            legend="Tipo"
            name={field.name}
            value={field.value}
            onChange={field.onChange}
            error={fieldState.error?.message}
            options={KINDS.map((value) => ({
              value,
              label: HEALTH_KIND_LABELS[value],
              visual: (
                <HealthKindIcon kind={value} className="shrink-0 text-health" />
              ),
            }))}
          />
        )}
      />
      {children}
      <Controller
        name="name"
        control={control}
        render={({ field, fieldState }) => (
          <TextField
            label="Nombre"
            autoComplete="off"
            autoCapitalize="sentences"
            name={field.name}
            value={field.value ?? ""}
            onChange={field.onChange}
            onBlur={field.onBlur}
            ref={field.ref}
            error={fieldState.error?.message}
          />
        )}
      />
      <DoseFields />
      <Controller
        name="administeredAt"
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
      {TEXT_AREAS.map(({ name, id, label }) => (
        <Controller
          key={name}
          name={name}
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={id}>{label}</FieldLabel>
              <Textarea
                {...field}
                id={id}
                value={field.value ?? ""}
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      ))}
    </>
  );
}
