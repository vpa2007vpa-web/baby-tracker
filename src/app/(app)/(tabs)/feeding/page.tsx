import { Milk } from "lucide-react";
import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { requireBaby } from "@/features/auth/session";

export const metadata: Metadata = { title: "Tomas · Métricas Bebé" };

// Placeholder of the layout base task, so the bottom bar can be walked end
// to end; the Tomas screen replaces it.
export default function FeedingPage(): ReactNode {
  return (
    <>
      <PageHeader title="Tomas" />
      <Suspense fallback={<Skeleton className="h-60 w-full rounded-2xl" />}>
        <FeedingPlaceholder />
      </Suspense>
    </>
  );
}

async function FeedingPlaceholder(): Promise<ReactNode> {
  // Same guard as the real screen will have (CLAUDE.md §2.2).
  await requireBaby();
  return (
    <EmptyState
      icon={Milk}
      title="Muy pronto"
      description="Aquí registrarás las tomas: pecho con cronómetro y biberón."
      iconSurfaceClassName="bg-feeding-soft"
      iconClassName="text-feeding"
    />
  );
}
