import { Plus, Ruler } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StickyActionBar } from "@/components/shared/sticky-action-bar";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { requireBaby } from "@/features/auth/session";
import { GrowthHistory } from "@/features/growth/components/growth-history";
import { LatestGrowthCard } from "@/features/growth/components/latest-growth-card";
import { listGrowthMeasurements } from "@/features/growth/queries";
import { listHouseholdMembers } from "@/features/household/queries";
import { authorNamesOf } from "@/lib/authors";
import { env } from "@/lib/env";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Crecimiento · Métricas Bebé" };

export default function GrowthPage(): ReactNode {
  return (
    <>
      <PageHeader backHref="/more" title="Crecimiento" />
      <Suspense fallback={<GrowthSkeleton />}>
        <GrowthSection />
      </Suspense>
    </>
  );
}

async function GrowthSection(): Promise<ReactNode> {
  const { member, baby } = await requireBaby();
  const [measurements, members] = await Promise.all([
    listGrowthMeasurements(baby.id),
    listHouseholdMembers(member.householdId),
  ]);
  const now = new Date();
  const timeZone = env.APP_TIMEZONE;

  return (
    <div className="flex flex-1 flex-col gap-4">
      {measurements.length > 0 ? (
        <>
          <LatestGrowthCard
            measurements={measurements}
            now={now}
            timeZone={timeZone}
          />
          <GrowthHistory
            measurements={measurements}
            now={now}
            timeZone={timeZone}
            viewerId={member.userId}
            authorNames={authorNamesOf(members)}
          />
        </>
      ) : (
        <EmptyState
          icon={Ruler}
          title="Aún no hay medidas"
          description="Apunta el peso, la longitud o el perímetro craneal de la próxima revisión."
          iconSurfaceClassName="bg-growth-soft"
          iconClassName="text-growth"
        />
      )}
      {/* Navigation only: the form disables saving when offline. */}
      <StickyActionBar areControlsEnabled>
        <Link
          href="/growth/new"
          className={cn(
            buttonVariants({ size: "lg" }),
            "h-14 w-full text-base",
          )}
        >
          <Plus aria-hidden className="size-5" />
          Añadir medida
        </Link>
      </StickyActionBar>
    </div>
  );
}

function GrowthSkeleton(): ReactNode {
  return (
    <div
      role="status"
      aria-label="Cargando"
      className="flex flex-1 flex-col gap-4"
    >
      <Skeleton className="h-32 w-full rounded-2xl" />
      {Array.from({ length: 3 }, (_, index) => (
        <Skeleton key={index} className="h-14 w-full rounded-xl" />
      ))}
      <Skeleton className="mt-auto h-20 w-full rounded-2xl" />
    </div>
  );
}
