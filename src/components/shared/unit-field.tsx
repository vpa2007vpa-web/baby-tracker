"use client";

import { useId, type ComponentProps, type ReactNode } from "react";

import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type UnitFieldProps = Omit<
  ComponentProps<"input">,
  "id" | "type" | "inputMode" | "value" | "onChange"
> & {
  label: string;
  /** Raw form value: "4,85" as typed, or a number from a default. */
  value: string | number | undefined;
  onChange: (value: string) => void;
  /** Drawn inside the field and said in its accessible name, e.g. "kg". */
  unit: string;
  description?: string;
  error?: string;
};

/**
 * A decimal measure such as a weight in kg: the decimal keypad, and a comma
 * or a dot both accepted (the schema parses them). Steps make no sense for
 * 4,85 kg, so unlike NumberStepper it has no − / + buttons.
 */
export function UnitField({
  label,
  value,
  onChange,
  unit,
  description,
  error,
  ...inputProps
}: UnitFieldProps): ReactNode {
  const id = useId();
  const descriptionId = `${id}-description`;
  const errorId = `${id}-error`;
  const describedBy = [description && descriptionId, error && errorId]
    .filter(Boolean)
    .join(" ");
  const isInvalid = error !== undefined;

  return (
    <Field data-invalid={isInvalid}>
      <FieldLabel htmlFor={id}>
        {label}
        {/* The unit is drawn inside the field (aria-hidden): say it here. */}
        <span className="sr-only"> ({unit})</span>
      </FieldLabel>
      <div className="relative">
        <Input
          {...inputProps}
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={isInvalid}
          aria-describedby={describedBy || undefined}
          className="h-12 pr-14 text-xl tabular-nums"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-muted-foreground"
        >
          {unit}
        </span>
      </div>
      {description && (
        <FieldDescription id={descriptionId}>{description}</FieldDescription>
      )}
      {isInvalid && <FieldError id={errorId}>{error}</FieldError>}
    </Field>
  );
}
