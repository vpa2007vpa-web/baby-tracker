import { toast } from "sonner";

import { deleteDiaperChange } from "@/features/diapers/actions";

const UNDO_DURATION_MS = 6000;

/**
 * Success toast with "Deshacer" after logging a diaper (CLAUDE.md §4.3):
 * undoing deletes the record just created, for both parents.
 */
export function offerUndo(message: string, id: string): void {
  toast.success(message, {
    duration: UNDO_DURATION_MS,
    action: {
      label: "Deshacer",
      onClick: () => {
        void undo(id);
      },
    },
  });
}

async function undo(id: string): Promise<void> {
  const result = await deleteDiaperChange({ id });
  if (result.ok) {
    toast.success("Pañal borrado");
  } else {
    toast.error("No hemos podido deshacerlo. Bórralo desde el historial.");
  }
}
