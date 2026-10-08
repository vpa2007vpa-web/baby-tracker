import type { ReactNode } from "react";

import { FormSkeleton } from "@/components/shared/form-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading(): ReactNode {
  return (
    <>
      <div className="flex flex-col gap-2">
        <Skeleton className="size-12 rounded-full" />
        <Skeleton className="h-9 w-2/3" />
      </div>
      <FormSkeleton fields={2} />
    </>
  );
}
