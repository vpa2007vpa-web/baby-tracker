"use client";

import { Check } from "lucide-react";
import { useId, type ReactNode } from "react";

import { cn } from "@/lib/utils";

export type ChoiceOption<T extends string> = {
  value: T;
  label: string;
  /** Icon or color swatch shown before the label (decorative). */
  visual?: ReactNode;
};

type ChoiceGridProps<T extends string> = {
  legend: string;
  name: string;
  options: readonly ChoiceOption<T>[];
  value: T | undefined;
  onChange: (value: T) => void;
  columns?: 2 | 3;
  error?: string;
};

/**
 * Large single-choice options instead of a <select> or the keyboard
 * (CLAUDE.md §4.2). Native radios inside a fieldset: arrow keys, screen
 * readers and form semantics come for free. The chosen option shows a
 * border, a fill and a check mark, never color alone (§4.4).
 */
export function ChoiceGrid<T extends string>({
  legend,
  name,
  options,
  value,
  onChange,
  columns = 2,
  error,
}: ChoiceGridProps<T>): ReactNode {
  const errorId = `${useId()}-error`;

  return (
    <fieldset
      aria-invalid={error !== undefined}
      aria-describedby={error ? errorId : undefined}
      className="flex flex-col gap-3"
    >
      <legend className="mb-3 text-sm font-medium">{legend}</legend>
      <div
        className={cn(
          "grid gap-2",
          columns === 3 ? "grid-cols-3" : "grid-cols-2",
        )}
      >
        {options.map((option) => {
          const isChecked = option.value === value;
          return (
            <label
              key={option.value}
              className={cn(
                "flex min-h-14 cursor-pointer items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2 text-base font-medium transition-colors has-focus-visible:ring-[3px] has-focus-visible:ring-ring",
                isChecked && "border-foreground bg-muted",
              )}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={isChecked}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              {option.visual}
              <span className="flex-1 leading-tight">{option.label}</span>
              {isChecked && <Check aria-hidden className="size-5 shrink-0" />}
            </label>
          );
        })}
      </div>
      {error && (
        <p id={errorId} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </fieldset>
  );
}
