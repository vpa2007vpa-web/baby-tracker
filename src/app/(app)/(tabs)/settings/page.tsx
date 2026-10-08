import { Settings } from "lucide-react";
import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { requireMember } from "@/features/auth/session";

export const metadata: Metadata = { title: "Ajustes · Métricas Bebé" };

// Placeholder of the layout base task, so the bottom bar can be walked end
// to end; the Ajustes screen replaces it.
export default function SettingsPage(): ReactNode {
  return (
    <>
      <PageHeader backHref="/more" title="Ajustes" />
      <Suspense fallback={<Skeleton className="h-60 w-full rounded-2xl" />}>
        <SettingsPlaceholder />
      </Suspense>
    </>
  );
}

async function SettingsPlaceholder(): Promise<ReactNode> {
  // Same guard as the real screen will have (CLAUDE.md §2.2).
  await requireMember();
  return (
    <EmptyState
      icon={Settings}
      title="Muy pronto"
      description="Aquí gestionarás tu familia y la app."
    />
  );
}
