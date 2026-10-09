import { Syringe } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StickyActionBar } from "@/components/shared/sticky-action-bar";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { requireBaby } from "@/features/auth/session";
import { HealthHistory } from "@/features/health/components/health-history";
import { HealthKindIcon } from "@/features/health/components/health-kind-icon";
import { HEALTH_KIND_LABELS } from "@/features/health/labels";
import { listHealthRecords } from "@/features/health/queries";
import { listHouseholdMembers } from "@/features/household/queries";
import type { HealthRecordKind } from "@/generated/prisma/enums";
import { authorNamesOf } from "@/lib/authors";
import { env } from "@/lib/env";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Salud · Métricas Bebé" };

const KINDS: readonly HealthRecordKind[] = ["VACCINE", "MEDICATION"];

export default function HealthPage(): ReactNode {
  return (
    <>
      <PageHeader backHref="/more" title="Salud" />
      <Suspense fallback={<HealthSkeleton />}>
        <HealthSection />
      </Suspense>
    </>
  );
}

async function HealthSection(): Promise<ReactNode> {
  const { member, baby } = await requireBaby();
  const [records, members] = await Promise.all([
    listHealthRecords(baby.id),
    listHouseholdMembers(member.householdId),
  ]);

  return (
    <div className="flex flex-1 flex-col gap-4">
      {records.length > 0 ? (
        <HealthHistory
          records={records}
          now={new Date()}
          timeZone={env.APP_TIMEZONE}
          viewerId={member.userId}
          authorNames={authorNamesOf(members)}
        />
      ) : (
        <EmptyState
          icon={Syringe}
          title="Aún no hay vacunas ni medicamentos"
          description="Apunta cada vacuna o medicamento con su dosis y si hubo alguna reacción."
          iconSurfaceClassName="bg-health-soft"
          iconClassName="text-health"
        />
      )}
      {/* Navigation only: the form disables saving when offline. One link
          per kind saves the first choice of the form. */}
      <StickyActionBar areControlsEnabled>
        <div className="grid grid-cols-2 gap-2">
          {KINDS.map((kind) => (
            <Link
              key={kind}
              href={`/health/new?kind=${kind}`}
              className={cn(buttonVariants({ size: "lg" }), "h-14 text-base")}
            >
              <HealthKindIcon kind={kind} />
              <span className="sr-only">Añadir </span>
              {HEALTH_KIND_LABELS[kind]}
            </Link>
          ))}
        </div>
      </StickyActionBar>
    </div>
  );
}

function HealthSkeleton(): ReactNode {
  return (
    <div
      role="status"
      aria-label="Cargando"
      className="flex flex-1 flex-col gap-4"
    >
      {Array.from({ length: 4 }, (_, index) => (
        <Skeleton key={index} className="h-16 w-full rounded-xl" />
      ))}
      <Skeleton className="mt-auto h-20 w-full rounded-2xl" />
    </div>
  );
}
