"use client";

import { CircleAlert, RotateCw } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";

type ErrorStateProps = {
  /** `retry` from error.tsx: re-fetches and re-renders the failed segment. */
  retry: () => void;
};

/**
 * Body of every error.tsx. Server details never reach the client (Next.js
 * only forwards a digest), so the copy stays generic and offers a way out.
 */
export function ErrorState({ retry }: ErrorStateProps): ReactNode {
  return (
    <div className="flex flex-1 flex-col gap-6">
      <div role="alert" className="flex flex-col gap-2">
        <CircleAlert aria-hidden className="size-8 text-destructive" />
        <h1 className="text-3xl font-semibold text-balance">
          No hemos podido cargar esta pantalla
        </h1>
        <p className="text-muted-foreground">
          Revisa tu conexión y vuelve a intentarlo.
        </p>
      </div>
      <Button
        type="button"
        size="lg"
        onClick={retry}
        className="mt-auto h-14 w-full text-base"
      >
        <RotateCw aria-hidden className="size-5" />
        Reintentar
      </Button>
    </div>
  );
}
