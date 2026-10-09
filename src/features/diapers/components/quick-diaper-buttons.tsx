"use client";

import { WifiOff } from "lucide-react";
import { useRef, useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";

import {
  createDiaperChange,
  deleteDiaperChange,
} from "@/features/diapers/actions";
import { DIAPER_TYPE_ICONS } from "@/features/diapers/components/diaper-type-icons";
import { DIAPER_TYPE_LABELS } from "@/features/diapers/labels";
import type { DiaperType } from "@/generated/prisma/enums";
import { useOnlineStatus } from "@/lib/use-online-status";

const QUICK_TYPES: readonly DiaperType[] = ["WET", "DIRTY", "MIXED"];
const UNDO_DURATION_MS = 6000;

/**
 * One tap logs a diaper now (CLAUDE.md §2.4, §4.2); color and texture can be
 * added later from the history. Sticky above the bottom bar, in the thumb
 * zone; data-sticky-actions lifts the toasts above it (globals.css).
 */
export function QuickDiaperButtons({ babyId }: { babyId: string }): ReactNode {
  const [savingType, setSavingType] = useState<DiaperType | null>(null);
  const [, startTransition] = useTransition();
  // Each tap gets its own UUID, so the server's idempotency cannot tell a
  // double tap from two diapers. The ref shuts the second tap out
  // synchronously, before React re-renders the disabled buttons.
  const isSavingRef = useRef(false);
  const isOnline = useOnlineStatus();

  function undo(id: string): void {
    startTransition(async () => {
      const result = await deleteDiaperChange({ id });
      if (result.ok) {
        toast.success("Pañal borrado");
      } else {
        toast.error("No hemos podido deshacerlo. Bórralo desde el historial.");
      }
    });
  }

  function record(type: DiaperType): void {
    if (isSavingRef.current) return;
    isSavingRef.current = true;
    setSavingType(type);
    const id = crypto.randomUUID();

    startTransition(async () => {
      try {
        const result = await createDiaperChange({ id, babyId, type });
        if (result.ok) {
          toast.success(
            `Pañal ${DIAPER_TYPE_LABELS[type].toLowerCase()} guardado`,
            {
              duration: UNDO_DURATION_MS,
              action: { label: "Deshacer", onClick: () => undo(id) },
            },
          );
        } else {
          toast.error(result.error.message);
        }
      } finally {
        isSavingRef.current = false;
        setSavingType(null);
      }
    });
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
              disabled={savingType !== null || !isOnline}
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
