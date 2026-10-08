import { Syringe } from "lucide-react";
import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { requireBaby } from "@/features/auth/session";

export const metadata: Metadata = { title: "Salud · Métricas Bebé" };

// Placeholder of the layout base task, so the bottom bar can be walked end
// to end; the Salud screen replaces it.
export default function HealthPage(): ReactNode {
  return (
    <>
      <PageHeader backHref="/more" title="Salud" />
      <Suspense fallback={<Skeleton className="h-60 w-full rounded-2xl" />}>
        <HealthPlaceholder />
      </Suspense>
    </>
  );
}

async function HealthPlaceholder(): Promise<ReactNode> {
  // Same guard as the real screen will have (CLAUDE.md §2.2).
  await requireBaby();
  return (
    <EmptyState
      icon={Syringe}
      title="Muy pronto"
      description="Aquí anotarás las vacunas y los medicamentos."
      iconSurfaceClassName="bg-health-soft"
      iconClassName="text-health"
    />
  );
}
