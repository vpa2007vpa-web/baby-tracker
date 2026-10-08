import { Ruler } from "lucide-react";
import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { requireBaby } from "@/features/auth/session";

export const metadata: Metadata = { title: "Crecimiento · Métricas Bebé" };

// Placeholder of the layout base task, so the bottom bar can be walked end
// to end; the Crecimiento screen replaces it.
export default function GrowthPage(): ReactNode {
  return (
    <>
      <PageHeader backHref="/more" title="Crecimiento" />
      <Suspense fallback={<Skeleton className="h-60 w-full rounded-2xl" />}>
        <GrowthPlaceholder />
      </Suspense>
    </>
  );
}

async function GrowthPlaceholder(): Promise<ReactNode> {
  // Same guard as the real screen will have (CLAUDE.md §2.2).
  await requireBaby();
  return (
    <EmptyState
      icon={Ruler}
      title="Muy pronto"
      description="Aquí guardarás el peso, la longitud y el perímetro craneal."
      iconSurfaceClassName="bg-growth-soft"
      iconClassName="text-growth"
    />
  );
}
