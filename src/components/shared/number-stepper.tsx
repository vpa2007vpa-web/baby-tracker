"use client";

import { Minus, Plus } from "lucide-react";
import { useId, type ComponentProps, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type NumberStepperProps = Omit<
  ComponentProps<"input">,
  "id" | "type" | "value" | "onChange" | "step" | "min" | "max"
> & {
  label: string;
  /** Raw form value: what the parent typed, or a number from a button. */
  value: string | number | undefined;
  onChange: (value: string) => void;
  /** Shown next to the field and in the buttons' names, e.g. "ml". */
  unit: string;
  step: number;
  min: number;
  max: number;
  description?: string;
  error?: string;
};

/**
 * A number with large − / + buttons, so the keyboard is optional (CLAUDE.md
 * §4.2). The value stays a string while typing; the schema parses it.
 */
export function NumberStepper({
  label,
  value,
  onChange,
  unit,
  step,
  min,
  max,
  description,
  error,
  ...inputProps
}: NumberStepperProps): ReactNode {
  const id = useId();
  const descriptionId = `${id}-description`;
  const errorId = `${id}-error`;
  const describedBy = [description && descriptionId, error && errorId]
    .filter(Boolean)
    .join(" ");
  const isInvalid = error !== undefined;
  const current = Number(String(value ?? "").replace(",", "."));
  const base = Number.isFinite(current) ? current : 0;

  function shift(delta: number): void {
    onChange(String(Math.min(max, Math.max(min, base + delta))));
  }

  return (
    <Field data-invalid={isInvalid}>
      <FieldLabel htmlFor={id}>
        {label}
        {/* The unit is drawn inside the field (aria-hidden): say it here. */}
        <span className="sr-only"> ({unit})</span>
      </FieldLabel>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          aria-label={`Restar ${step} ${unit}`}
          disabled={base <= min}
          onClick={() => shift(-step)}
          className="size-12 shrink-0"
        >
          <Minus aria-hidden className="size-5" />
        </Button>
        <div className="relative flex-1">
          <Input
            {...inputProps}
            id={id}
            type="text"
            inputMode="numeric"
            value={value ?? ""}
            onChange={(event) => onChange(event.target.value)}
            aria-invalid={isInvalid}
            aria-describedby={describedBy || undefined}
            className="h-12 pr-12 text-center text-xl tabular-nums"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-muted-foreground"
          >
            {unit}
          </span>
        </div>
        <Button
          type="button"
          variant="outline"
          aria-label={`Sumar ${step} ${unit}`}
          disabled={base >= max}
          onClick={() => shift(step)}
          className="size-12 shrink-0"
        >
          <Plus aria-hidden className="size-5" />
        </Button>
      </div>
      {description && (
        <FieldDescription id={descriptionId}>{description}</FieldDescription>
      )}
      {isInvalid && <FieldError id={errorId}>{error}</FieldError>}
    </Field>
  );
}
