import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { requireNoHousehold } from "@/features/auth/session";
import { JoinOptions } from "@/features/household/components/join-options";

export const metadata: Metadata = { title: "Tu familia · Métricas Bebé" };

// Landing for signed-in users without a household (requireMember() sends
// them here). The header is static; the session check streams in.
export default function JoinPage(): ReactNode {
  return (
    <>
      <PageHeader
        title="Prepara tu familia"
        description="Los dos veréis y registraréis lo mismo, cada uno en su móvil."
      />
      <Suspense fallback={<JoinPageSkeleton />}>
        <JoinPageActions />
      </Suspense>
    </>
  );
}

async function JoinPageActions(): Promise<ReactNode> {
  await requireNoHousehold();

  return (
    <div className="mt-auto flex flex-col gap-6">
      <JoinOptions />
      <SignOutButton />
    </div>
  );
}

function JoinPageSkeleton(): ReactNode {
  return (
    <div aria-hidden className="mt-auto flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-20 w-full rounded-2xl" />
      </div>
      <Skeleton className="h-14 w-full rounded-4xl" />
    </div>
  );
}
