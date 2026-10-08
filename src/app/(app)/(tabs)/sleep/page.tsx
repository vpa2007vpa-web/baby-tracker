import { Moon } from "lucide-react";
import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { requireBaby } from "@/features/auth/session";

export const metadata: Metadata = { title: "Sueño · Métricas Bebé" };

// Placeholder of the layout base task, so the bottom bar can be walked end
// to end; the Sueño screen replaces it.
export default function SleepPage(): ReactNode {
  return (
    <>
      <PageHeader title="Sueño" />
      <Suspense fallback={<Skeleton className="h-60 w-full rounded-2xl" />}>
        <SleepPlaceholder />
      </Suspense>
    </>
  );
}

async function SleepPlaceholder(): Promise<ReactNode> {
  // Same guard as the real screen will have (CLAUDE.md §2.2).
  await requireBaby();
  return (
    <EmptyState
      icon={Moon}
      title="Muy pronto"
      description="Aquí controlarás las siestas y el sueño de la noche."
      iconSurfaceClassName="bg-sleep-soft"
      iconClassName="text-sleep"
    />
  );
}
