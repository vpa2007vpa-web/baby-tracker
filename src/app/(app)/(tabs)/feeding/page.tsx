import { Milk, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { DayNav } from "@/components/shared/day-nav";
import { EmptyState } from "@/components/shared/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { requireBaby } from "@/features/auth/session";
import { summarizeFeedings } from "@/features/dashboard/service";
import { BreastTimerBar } from "@/features/feeding/components/breast-timer-bar";
import { FeedingHistory } from "@/features/feeding/components/feeding-history";
import { describeFeedingCounts } from "@/features/feeding/labels";
import {
  getActiveFeeding,
  getLastBreastFeeding,
  listFeedingsByDay,
} from "@/features/feeding/queries";
import { suggestNextBreast } from "@/features/feeding/service";
import { listHouseholdMembers } from "@/features/household/queries";
import { authorLabel, authorNamesOf } from "@/lib/authors";
import { dayNavProps, formatDayLabel, resolveDay } from "@/lib/dates";
import { env } from "@/lib/env";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Tomas · Métricas Bebé" };

export default function FeedingPage({
  searchParams,
}: PageProps<"/feeding">): ReactNode {
  return (
    <>
      <PageHeader title="Tomas" />
      <Suspense fallback={<FeedingSkeleton />}>
        <FeedingSection searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function FeedingSection({
  searchParams,
}: Pick<PageProps<"/feeding">, "searchParams">): Promise<ReactNode> {
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
  const [feedings, members, active, lastBreast] = await Promise.all([
    listFeedingsByDay(baby.id, day.range),
    listHouseholdMembers(member.householdId),
    getActiveFeeding(baby.id),
    getLastBreastFeeding(baby.id),
  ]);
  const authorNames = authorNamesOf(members);
  const dayLinks = dayNavProps("/feeding", day, now, timeZone);

  return (
    <div className="flex flex-1 flex-col gap-4">
      <DayNav label={formatDayLabel(day, now, timeZone)} {...dayLinks} />
      {feedings.length > 0 ? (
        <>
          <p className="text-muted-foreground">
            {describeFeedingCounts(summarizeFeedings(feedings, day.range, now))}
          </p>
          <FeedingHistory
            feedings={feedings}
            day={day.range}
            timeZone={timeZone}
            viewerId={member.userId}
            authorNames={authorNames}
          />
        </>
      ) : (
        <EmptyState
          icon={Milk}
          title={day.isToday ? "Aún no hay tomas hoy" : "No hay tomas este día"}
          description={
            day.isToday
              ? "Empieza una toma o registra un biberón con los botones de abajo."
              : "Si se te olvidó alguna, añádela con su hora."
          }
          iconSurfaceClassName="bg-feeding-soft"
          iconClassName="text-feeding"
        />
      )}
      <Link
        href="/feeding/new"
        className={cn(
          buttonVariants({ variant: "ghost" }),
          "h-12 self-start px-3 text-base",
        )}
      >
        <Plus aria-hidden className="size-5" />
        Añadir con otra hora
      </Link>
      {/* The bar starts feedings "now": only on today. */}
      {day.isToday && (
        <BreastTimerBar
          babyId={baby.id}
          serverNow={now.toISOString()}
          suggestedSide={suggestNextBreast(lastBreast?.type ?? null)}
          running={
            active && active.type !== "BOTTLE"
              ? {
                  id: active.id,
                  type: active.type,
                  startedAt: active.startedAt.toISOString(),
                  startedBy: authorLabel(
                    active.createdById,
                    member.userId,
                    authorNames,
                  ),
                }
              : null
          }
        />
      )}
    </div>
  );
}

function FeedingSkeleton(): ReactNode {
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
