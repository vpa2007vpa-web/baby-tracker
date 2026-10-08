import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { FormSkeleton } from "@/components/shared/form-skeleton";
import { requireNoHousehold } from "@/features/auth/session";
import { JoinHouseholdForm } from "@/features/household/components/join-household-form";

export const metadata: Metadata = {
  title: "Únete a tu familia · Métricas Bebé",
};

export default function JoinWithCodePage(): ReactNode {
  return (
    <>
      <PageHeader
        backHref="/join"
        title="Únete a tu familia"
        description="Escribe el código que te ha enviado el otro progenitor."
      />
      <Suspense fallback={<FormSkeleton fields={2} />}>
        <JoinWithCodeSection />
      </Suspense>
    </>
  );
}

async function JoinWithCodeSection(): Promise<ReactNode> {
  await requireNoHousehold();
  return <JoinHouseholdForm />;
}
