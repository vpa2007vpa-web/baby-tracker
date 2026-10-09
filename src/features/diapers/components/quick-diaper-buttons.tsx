"use client";

import { WifiOff } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import { offerUndo } from "@/components/shared/offer-undo";
import {
  createDiaperChange,
  deleteDiaperChange,
} from "@/features/diapers/actions";
import { DIAPER_TYPE_ICONS } from "@/features/diapers/components/diaper-type-icons";
import { DIAPER_TYPE_LABELS } from "@/features/diapers/labels";
import type { DiaperType } from "@/generated/prisma/enums";
import { useOnlineStatus } from "@/lib/use-online-status";
import { useSingleFlight } from "@/lib/use-single-flight";

const QUICK_TYPES: readonly DiaperType[] = ["WET", "DIRTY", "MIXED"];

/**
 * One tap logs a diaper now (CLAUDE.md §2.4, §4.2); color and texture can be
 * added later from the history. Sticky above the bottom bar, in the thumb
 * zone; data-sticky-actions lifts the toasts above it (globals.css).
 */
export function QuickDiaperButtons({ babyId }: { babyId: string }): ReactNode {
  const { isBusy, run } = useSingleFlight();
  const [savingType, setSavingType] = useState<DiaperType | null>(null);
  const isOnline = useOnlineStatus();

  function record(type: DiaperType): void {
    const id = crypto.randomUUID();
    const isStarted = run(async () => {
      try {
        const result = await createDiaperChange({ id, babyId, type });
        if (result.ok) {
          offerUndo({
            message: `Pañal ${DIAPER_TYPE_LABELS[type].toLowerCase()} guardado`,
            undo: () => deleteDiaperChange({ id }),
            undoneMessage: "Pañal borrado",
          });
        } else {
          toast.error(result.error.message);
        }
      } finally {
        setSavingType(null);
      }
    });
    if (isStarted) setSavingType(type);
  }

  return (
    <div
      data-sticky-actions
      className="sticky bottom-[calc(var(--bottom-nav-height)_+_env(safe-area-inset-bottom))] z-10 -mx-4 mt-auto flex flex-col gap-2 border-t border-border bg-background px-4 py-3"
    >
      {!isOnline && (
        <p
          role="status"
          className="flex items-center justify-center gap-2 text-sm text-muted-foreground"
        >
          <WifiOff aria-hidden className="size-5" />
          Sin conexión. Conéctate para registrar.
        </p>
      )}
      <div className="grid grid-cols-3 gap-2">
        {QUICK_TYPES.map((type) => {
          const Icon = DIAPER_TYPE_ICONS[type];
          const isSaving = savingType === type;
          return (
            <button
              key={type}
              type="button"
              onClick={() => record(type)}
              disabled={isBusy || !isOnline}
              aria-busy={isSaving}
              className="flex h-20 flex-col items-center justify-center gap-1 rounded-2xl bg-diapers-soft text-base font-semibold outline-none focus-visible:ring-[3px] focus-visible:ring-ring disabled:opacity-50"
            >
              <Icon aria-hidden className="size-7 text-diapers" />
              {isSaving ? "Guardando…" : DIAPER_TYPE_LABELS[type]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
