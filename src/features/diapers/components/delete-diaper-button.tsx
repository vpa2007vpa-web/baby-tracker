"use client";

import { Trash } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { deleteDiaperChange } from "@/features/diapers/actions";
import { useOnlineStatus } from "@/lib/use-online-status";

type DeleteDiaperButtonProps = {
  id: string;
  /** Where to go once it is gone: the history of its day. */
  returnHref: string;
};

/**
 * Deleting is permanent and shared (CLAUDE.md §2.6): an AlertDialog asks
 * first, the one dialog the MVP allows (§4.3).
 */
export function DeleteDiaperButton({
  id,
  returnHref,
}: DeleteDiaperButtonProps): ReactNode {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const isOnline = useOnlineStatus();

  function remove(): void {
    startTransition(async () => {
      const result = await deleteDiaperChange({ id });
      if (result.ok) {
        setIsOpen(false);
        toast.success("Pañal borrado");
        router.replace(returnHref);
        return;
      }
      toast.error(result.error.message);
    });
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger
        disabled={!isOnline}
        render={
          <Button
            type="button"
            variant="ghost"
            size="lg"
            className="h-12 w-full text-base text-destructive"
          />
        }
      >
        <Trash aria-hidden className="size-5" />
        Borrar pañal
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Borrar este pañal?</AlertDialogTitle>
          <AlertDialogDescription>
            Se borrará para los dos. No se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="h-12 text-base">
            Cancelar
          </AlertDialogCancel>
          {/* Solid red: the tinted "destructive" variant gives its text only
              3.99:1 in light mode (WCAG 1.4.3 asks 4.5:1). */}
          <AlertDialogAction
            type="button"
            disabled={isPending}
            onClick={remove}
            className="h-12 bg-destructive text-base text-background hover:bg-destructive/90"
          >
            {isPending ? "Borrando…" : "Borrar pañal"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
