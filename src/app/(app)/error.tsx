"use client";

import type { ReactNode } from "react";

import { ErrorState } from "@/components/shared/error-state";

export default function AppError({ retry }: { retry: () => void }): ReactNode {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pt-8 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <ErrorState retry={retry} />
    </main>
  );
}
