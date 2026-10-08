"use client";

import { WifiOff } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { useOnlineStatus } from "@/lib/use-online-status";

type SubmitButtonProps = {
  isPending: boolean;
  pendingLabel: string;
  children: ReactNode;
  /** "button" with onClick for actions that are not a form submit. */
  type?: "submit" | "button";
  onClick?: () => void;
};

/**
 * The screen's primary action: disabled while its action runs and while
 * offline, since the MVP has no offline writes (CLAUDE.md §2.4, §2.8).
 */
export function SubmitButton({
  isPending,
  pendingLabel,
  children,
  type = "submit",
  onClick,
}: SubmitButtonProps): ReactNode {
  const isOnline = useOnlineStatus();

  return (
    <div className="flex flex-col gap-2">
      {!isOnline && (
        <p
          role="status"
          className="flex items-center justify-center gap-2 text-sm text-muted-foreground"
        >
          <WifiOff aria-hidden className="size-5" />
          Sin conexión. Conéctate para continuar.
        </p>
      )}
      <Button
        type={type}
        size="lg"
        disabled={isPending || !isOnline}
        onClick={onClick}
        className="h-14 w-full text-base"
      >
        {isPending ? pendingLabel : children}
      </Button>
    </div>
  );
}
