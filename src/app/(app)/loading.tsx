import type { ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";

export default function Loading(): ReactNode {
  return (
    <main
      aria-busy="true"
      aria-label="Cargando"
      className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pt-8"
    >
      <Skeleton className="h-9 w-2/3" />
      <div className="flex flex-col gap-3">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-14 w-full rounded-2xl" />
        ))}
      </div>
    </main>
  );
}
