"use client";

import { Copy, RefreshCw, Share2 } from "lucide-react";
import { useSyncExternalStore, type ReactNode } from "react";
import { toast } from "sonner";

import { FormFooter } from "@/components/shared/form-footer";
import { Button } from "@/components/ui/button";
import { buildInviteMessage } from "@/features/household/invite-message";
import { useOnlineStatus } from "@/lib/use-online-status";

type InviteCodeDisplayProps = {
  code: string;
  isRegenerating: boolean;
  onRegenerate: () => void;
};

function subscribeToNothing(): () => void {
  return () => undefined;
}

// The server cannot know whether the browser has a share sheet: render the
// copy-only variant first, so hydration never mismatches.
function useCanShare(): boolean {
  return useSyncExternalStore(
    subscribeToNothing,
    () => typeof navigator.share === "function",
    () => false,
  );
}

/** The freshly generated code: the only time it is ever visible (ADR-043). */
export function InviteCodeDisplay({
  code,
  isRegenerating,
  onRegenerate,
}: InviteCodeDisplayProps): ReactNode {
  const canShare = useCanShare();
  const isOnline = useOnlineStatus();

  async function copyCode(): Promise<void> {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Código copiado");
    } catch {
      toast.error("No hemos podido copiarlo. Mantén pulsado el código.");
    }
  }

  async function shareCode(): Promise<void> {
    const text = buildInviteMessage({
      code,
      appUrl: window.location.origin,
    });
    try {
      await navigator.share({ title: "Métricas Bebé", text });
    } catch (error) {
      // Closing the share sheet is a choice, not a failure.
      if (error instanceof DOMException && error.name === "AbortError") return;
      await copyCode();
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-col items-center gap-3 rounded-2xl bg-muted px-4 py-6 text-center">
        <p className="text-sm text-muted-foreground">Código de invitación</p>
        <p className="font-mono text-4xl font-semibold tracking-wider tabular-nums select-all">
          {code}
        </p>
        <p className="text-sm text-muted-foreground">
          Vale 24 horas y para una sola persona.
        </p>
      </div>
      <FormFooter>
        {canShare ? (
          <>
            <Button
              type="button"
              size="lg"
              autoFocus
              onClick={() => void shareCode()}
              className="h-14 w-full text-base"
            >
              <Share2 aria-hidden className="size-5" />
              Compartir
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => void copyCode()}
              className="h-12 w-full text-base"
            >
              <Copy aria-hidden className="size-5" />
              Copiar código
            </Button>
          </>
        ) : (
          <Button
            type="button"
            size="lg"
            autoFocus
            onClick={() => void copyCode()}
            className="h-14 w-full text-base"
          >
            <Copy aria-hidden className="size-5" />
            Copiar código
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="lg"
          disabled={isRegenerating || !isOnline}
          onClick={onRegenerate}
          className="h-12 w-full text-base"
        >
          <RefreshCw aria-hidden className="size-5" />
          {isRegenerating ? "Generando…" : "Generar otro"}
        </Button>
      </FormFooter>
    </div>
  );
}
