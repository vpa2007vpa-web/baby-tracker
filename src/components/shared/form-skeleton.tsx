import type { ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";

/** Suspense fallback with the shape of a form: `fields` inputs and the footer button. */
export function FormSkeleton({ fields }: { fields: number }): ReactNode {
  return (
    <div
      role="status"
      aria-label="Cargando"
      className="flex flex-1 flex-col gap-6"
    >
      {Array.from({ length: fields }, (_, index) => (
        <div key={index} className="flex flex-col gap-3">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-12 w-full rounded-4xl" />
        </div>
      ))}
      <Skeleton className="mt-auto h-14 w-full rounded-4xl" />
    </div>
  );
}
