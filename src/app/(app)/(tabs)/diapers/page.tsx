import { Baby } from "lucide-react";
import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { requireBaby } from "@/features/auth/session";

export const metadata: Metadata = { title: "Pañales · Métricas Bebé" };

// Placeholder of the layout base task, so the bottom bar can be walked end
// to end; the Pañales screen replaces it.
export default function DiapersPage(): ReactNode {
  return (
    <>
      <PageHeader title="Pañales" />
      <Suspense fallback={<Skeleton className="h-60 w-full rounded-2xl" />}>
        <DiapersPlaceholder />
      </Suspense>
    </>
  );
}

async function DiapersPlaceholder(): Promise<ReactNode> {
  // Same guard as the real screen will have (CLAUDE.md §2.2).
  await requireBaby();
  return (
    <EmptyState
      icon={Baby}
      title="Muy pronto"
      description="Aquí registrarás los pañales con un solo toque."
      iconSurfaceClassName="bg-diapers-soft"
      iconClassName="text-diapers"
    />
  );
}
