"use client";

import { useId, type ComponentProps, type ReactNode } from "react";

import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type TextFieldProps = Omit<ComponentProps<"input">, "id"> & {
  label: string;
  description?: string;
  error?: string;
};

/**
 * Labelled input for React Hook Form's `Controller` (spread `field` into it).
 * 48 px tall and 16 px text, so iOS never zooms in (CLAUDE.md §4.2); hint
 * and error are tied to the input with aria-describedby.
 */
export function TextField({
  label,
  description,
  error,
  className,
  ...inputProps
}: TextFieldProps): ReactNode {
  const id = useId();
  const descriptionId = `${id}-description`;
  const errorId = `${id}-error`;
  const describedBy = [description && descriptionId, error && errorId]
    .filter(Boolean)
    .join(" ");
  const isInvalid = error !== undefined;

  return (
    <Field data-invalid={isInvalid}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        {...inputProps}
        id={id}
        aria-invalid={isInvalid}
        aria-describedby={describedBy || undefined}
        className={cn("h-12 text-base", className)}
      />
      {description && (
        <FieldDescription id={descriptionId}>{description}</FieldDescription>
      )}
      {isInvalid && <FieldError id={errorId}>{error}</FieldError>}
    </Field>
  );
}
