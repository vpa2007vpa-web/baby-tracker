"use client";

import { useId, type ComponentProps, type ReactNode } from "react";

import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDateTimeLocalValue } from "@/lib/dates";
import { cn } from "@/lib/utils";

const MINUTE_MS = 60_000;

// The accessible name keeps the visible text ("−5 min") and adds the
// spoken hint, so voice control users can say what they see (WCAG 2.5.3).
const SHORTCUTS: ReadonlyArray<{
  minutesAgo: number;
  label: string;
  hint?: string;
}> = [
  { minutesAgo: 0, label: "Ahora" },
  { minutesAgo: 5, label: "−5 min", hint: "hace 5 minutos" },
  { minutesAgo: 15, label: "−15 min", hint: "hace 15 minutos" },
  { minutesAgo: 30, label: "−30 min", hint: "hace 30 minutos" },
];

type DateTimeFieldProps = Omit<
  ComponentProps<"input">,
  "id" | "type" | "value" | "onChange"
> & {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** The household zone (APP_TIMEZONE), handed down by the page. */
  timeZone: string;
  description?: string;
  error?: string;
};

/**
 * A date and time with the usual shortcuts ("Ahora", "−5 min"…), so the
 * keyboard is rarely needed (CLAUDE.md §4.2). The value is the household
 * wall-clock time; the schema turns it into an instant (§2.5).
 */
export function DateTimeField({
  label,
  value,
  onChange,
  timeZone,
  description,
  error,
  className,
  ...inputProps
}: DateTimeFieldProps): ReactNode {
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
        type="datetime-local"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={isInvalid}
        aria-describedby={describedBy || undefined}
        className={cn("h-12 text-base", className)}
      />
      <div className="grid grid-cols-4 gap-2">
        {SHORTCUTS.map((shortcut) => (
          <Button
            key={shortcut.minutesAgo}
            type="button"
            variant="outline"
            onClick={() =>
              onChange(
                formatDateTimeLocalValue(
                  new Date(Date.now() - shortcut.minutesAgo * MINUTE_MS),
                  timeZone,
                ),
              )
            }
            className="h-12 px-2 text-sm tabular-nums"
          >
            {shortcut.label}
            {shortcut.hint && (
              <span className="sr-only">, {shortcut.hint}</span>
            )}
          </Button>
        ))}
      </div>
      {description && (
        <FieldDescription id={descriptionId}>{description}</FieldDescription>
      )}
      {isInvalid && <FieldError id={errorId}>{error}</FieldError>}
    </Field>
  );
}
