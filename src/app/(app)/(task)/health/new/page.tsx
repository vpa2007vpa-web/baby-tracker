import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { FormSkeleton } from "@/components/shared/form-skeleton";
import { requireBaby } from "@/features/auth/session";
import { NewHealthForm } from "@/features/health/components/new-health-form";
import { listRecentMedications } from "@/features/health/queries";
import type { HealthRecordKind } from "@/generated/prisma/enums";
import { formatDateTimeLocalValue } from "@/lib/dates";
import { env } from "@/lib/env";

export const metadata: Metadata = {
  title: "Nueva vacuna o medicamento · Métricas Bebé",
};

/** `?kind=` from the history's links; anything else lets the parent pick. */
function parseKind(value: unknown): HealthRecordKind | undefined {
  return value === "VACCINE" || value === "MEDICATION" ? value : undefined;
}

export default function NewHealthPage({
  searchParams,
}: PageProps<"/health/new">): ReactNode {
  return (
    <>
      <PageHeader backHref="/health" title="Vacuna o medicamento" />
      <Suspense fallback={<FormSkeleton fields={5} />}>
        <NewHealthSection searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function NewHealthSection({
  searchParams,
}: Pick<PageProps<"/health/new">, "searchParams">): Promise<ReactNode> {
  const { baby } = await requireBaby();
  const [{ kind }, recentMedications] = await Promise.all([
    searchParams,
    listRecentMedications(baby.id),
  ]);
  const timeZone = env.APP_TIMEZONE;

  return (
    <NewHealthForm
      babyId={baby.id}
      timeZone={timeZone}
      kind={parseKind(kind)}
      administeredAt={formatDateTimeLocalValue(new Date(), timeZone)}
      recentMedications={recentMedications}
    />
  );
}
