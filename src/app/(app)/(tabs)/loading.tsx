import type { ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";

// Rendered inside the (tabs) layout: the bottom bar stays usable meanwhile.
export default function Loading(): ReactNode {
  return (
    <div role="status" aria-label="Cargando" className="flex flex-col gap-6">
      <Skeleton className="h-9 w-2/3" />
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-20 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
