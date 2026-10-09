import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { FormSkeleton } from "@/components/shared/form-skeleton";
import { requireBaby } from "@/features/auth/session";
import { NewGrowthForm } from "@/features/growth/components/new-growth-form";
import { formatDateTimeLocalValue } from "@/lib/dates";
import { env } from "@/lib/env";

export const metadata: Metadata = { title: "Nueva medida · Métricas Bebé" };

export default function NewGrowthPage(): ReactNode {
  return (
    <>
      <PageHeader backHref="/growth" title="Nueva medida" />
      <Suspense fallback={<FormSkeleton fields={4} />}>
        <NewGrowthSection />
      </Suspense>
    </>
  );
}

async function NewGrowthSection(): Promise<ReactNode> {
  const { baby } = await requireBaby();
  const timeZone = env.APP_TIMEZONE;

  return (
    <NewGrowthForm
      babyId={baby.id}
      timeZone={timeZone}
      measuredAt={formatDateTimeLocalValue(new Date(), timeZone)}
    />
  );
}
