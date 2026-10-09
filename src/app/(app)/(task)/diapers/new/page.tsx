import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { FormSkeleton } from "@/components/shared/form-skeleton";
import { requireBaby } from "@/features/auth/session";
import { NewDiaperForm } from "@/features/diapers/components/new-diaper-form";
import { formatDateTimeLocalValue } from "@/lib/dates";
import { env } from "@/lib/env";

export const metadata: Metadata = { title: "Nuevo pañal · Métricas Bebé" };

export default function NewDiaperPage(): ReactNode {
  return (
    <>
      <PageHeader backHref="/diapers" title="Nuevo pañal" />
      <Suspense fallback={<FormSkeleton fields={3} />}>
        <NewDiaperSection />
      </Suspense>
    </>
  );
}

async function NewDiaperSection(): Promise<ReactNode> {
  const { baby } = await requireBaby();
  const timeZone = env.APP_TIMEZONE;

  return (
    <NewDiaperForm
      babyId={baby.id}
      timeZone={timeZone}
      defaultOccurredAt={formatDateTimeLocalValue(new Date(), timeZone)}
    />
  );
}
