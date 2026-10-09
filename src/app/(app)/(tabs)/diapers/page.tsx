import { Baby, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { DayNav } from "@/components/shared/day-nav";
import { EmptyState } from "@/components/shared/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { requireBaby } from "@/features/auth/session";
import { DiaperHistory } from "@/features/diapers/components/diaper-history";
import { QuickDiaperButtons } from "@/features/diapers/components/quick-diaper-buttons";
import { describeDiaperCounts } from "@/features/diapers/labels";
import { listDiaperChangesByDay } from "@/features/diapers/queries";
import { countDiaperChanges } from "@/features/diapers/service";
import { listHouseholdMembers } from "@/features/household/queries";
import { authorNamesOf } from "@/lib/authors";
import { dayNavProps, formatDayLabel, resolveDay } from "@/lib/dates";
import { env } from "@/lib/env";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Pañales · Métricas Bebé" };

export default function DiapersPage({
  searchParams,
}: PageProps<"/diapers">): ReactNode {
  return (
    <>
      <PageHeader title="Pañales" />
      <Suspense fallback={<DiapersSkeleton />}>
        <DiapersSection searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function DiapersSection({
  searchParams,
}: Pick<PageProps<"/diapers">, "searchParams">): Promise<ReactNode> {
  const { member, baby } = await requireBaby();
  const { day: dayParam } = await searchParams;
  const now = new Date();
  const timeZone = env.APP_TIMEZONE;
  // The selected day lives in the URL (CLAUDE.md §2.4).
  const day = resolveDay(
    typeof dayParam === "string" ? dayParam : undefined,
    now,
    timeZone,
  );
  const [diapers, members] = await Promise.all([
    listDiaperChangesByDay(baby.id, day.range),
    listHouseholdMembers(member.householdId),
  ]);
  const authorNames = authorNamesOf(members);
  const dayLinks = dayNavProps("/diapers", day, now, timeZone);

  return (
    <div className="flex flex-1 flex-col gap-4">
      <DayNav label={formatDayLabel(day, now, timeZone)} {...dayLinks} />
      {diapers.length > 0 ? (
        <>
          <p className="text-muted-foreground">
            {describeDiaperCounts(countDiaperChanges(diapers))}
          </p>
          <DiaperHistory
            diapers={diapers}
            timeZone={timeZone}
            viewerId={member.userId}
            authorNames={authorNames}
          />
        </>
      ) : (
        <EmptyState
          icon={Baby}
          title={
            day.isToday ? "Aún no hay pañales hoy" : "No hay pañales este día"
          }
          description={
            day.isToday
              ? "Regístralo con un toque en los botones de abajo."
              : "Si se te olvidó alguno, añádelo con su hora."
          }
          iconSurfaceClassName="bg-diapers-soft"
          iconClassName="text-diapers"
        />
      )}
      <Link
        href="/diapers/new"
        className={cn(
          buttonVariants({ variant: "ghost" }),
          "h-12 self-start px-3 text-base",
        )}
      >
        <Plus aria-hidden className="size-5" />
        Añadir con otra hora
      </Link>
      {/* The one-tap buttons log "now": only on today. */}
      {day.isToday && <QuickDiaperButtons babyId={baby.id} />}
    </div>
  );
}

function DiapersSkeleton(): ReactNode {
  return (
    <div
      role="status"
      aria-label="Cargando"
      className="flex flex-1 flex-col gap-4"
    >
      <Skeleton className="h-12 w-full" />
      {Array.from({ length: 3 }, (_, index) => (
        <Skeleton key={index} className="h-14 w-full rounded-xl" />
      ))}
      <Skeleton className="mt-auto h-20 w-full rounded-2xl" />
    </div>
  );
}
