"use client";

import type { ReactNode } from "react";
import { Controller, useFormContext } from "react-hook-form";

import { ChoiceGrid } from "@/components/shared/choice-grid";
import { NumberStepper } from "@/components/shared/number-stepper";
import { Button } from "@/components/ui/button";
import {
  BOTTLE_CONTENT_LABELS,
  QUICK_BOTTLE_AMOUNTS_ML,
} from "@/features/feeding/labels";
import type { UpdateFeedingInput } from "@/features/feeding/schemas";
import type { BottleContent } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";

const BOTTLE_CONTENTS: readonly BottleContent[] = ["BREAST_MILK", "FORMULA"];

/** Amount (quick buttons or any value) and kind of milk of a bottle. */
export function BottleFields(): ReactNode {
  const { control } = useFormContext<UpdateFeedingInput>();

  return (
    <>
      <Controller
        name="amountMl"
        control={control}
        render={({ field, fieldState }) => (
          <div className="flex flex-col gap-3">
            <div
              role="group"
              aria-label="Cantidades habituales"
              className="grid grid-cols-4 gap-2"
            >
              {QUICK_BOTTLE_AMOUNTS_ML.map((amount) => {
                const isChosen = Number(field.value) === amount;
                return (
                  <Button
                    key={amount}
                    type="button"
                    variant="outline"
                    aria-pressed={isChosen}
                    onClick={() => field.onChange(amount)}
                    className={cn(
                      "h-12 text-base tabular-nums",
                      isChosen && "border-foreground bg-muted",
                    )}
                  >
                    {amount} ml
                  </Button>
                );
              })}
            </div>
            <NumberStepper
              label="Cantidad"
              name={field.name}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              ref={field.ref}
              unit="ml"
              step={10}
              min={0}
              max={400}
              error={fieldState.error?.message}
            />
          </div>
        )}
      />
      <Controller
        name="bottleContent"
        control={control}
        render={({ field, fieldState }) => (
          <ChoiceGrid
            legend="Leche"
            name={field.name}
            value={field.value}
            onChange={field.onChange}
            error={fieldState.error?.message}
            options={BOTTLE_CONTENTS.map((value) => ({
              value,
              label: BOTTLE_CONTENT_LABELS[value],
            }))}
          />
        )}
      />
    </>
  );
}
