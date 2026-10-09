import { Moon, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { DayNav } from "@/components/shared/day-nav";
import { EmptyState } from "@/components/shared/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { requireBaby } from "@/features/auth/session";
import { summarizeSleep } from "@/features/dashboard/service";
import { listHouseholdMembers } from "@/features/household/queries";
import { SleepHistory } from "@/features/sleep/components/sleep-history";
import { SleepTimerBar } from "@/features/sleep/components/sleep-timer-bar";
import { describeSleepCounts } from "@/features/sleep/labels";
import {
  getActiveSleepSession,
  listSleepSessionsByDay,
} from "@/features/sleep/queries";
import { authorLabel } from "@/lib/authors";
import { addDaysToDate, formatDayLabel, resolveDay } from "@/lib/dates";
import { env } from "@/lib/env";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Sueño · Métricas Bebé" };

export default function SleepPage({
  searchParams,
}: PageProps<"/sleep">): ReactNode {
  return (
    <>
      <PageHeader title="Sueño" />
      <Suspense fallback={<SleepSkeleton />}>
        <SleepSection searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function SleepSection({
  searchParams,
}: Pick<PageProps<"/sleep">, "searchParams">): Promise<ReactNode> {
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
  const [sessions, members, active] = await Promise.all([
    listSleepSessionsByDay(baby.id, day.range),
    listHouseholdMembers(member.householdId),
    getActiveSleepSession(baby.id),
  ]);
  const authorNames = Object.fromEntries(
    members.map(({ userId, displayName }) => [userId, displayName]),
  );
  const nextDate = addDaysToDate(day.date, 1);
  const today = resolveDay(undefined, now, timeZone).date;

  return (
    <div className="flex flex-1 flex-col gap-4">
      <DayNav
        label={formatDayLabel(day, now, timeZone)}
        previousHref={`/sleep?day=${addDaysToDate(day.date, -1)}`}
        nextHref={
          day.isToday
            ? null
            : nextDate === today
              ? "/sleep"
              : `/sleep?day=${nextDate}`
        }
      />
      {sessions.length > 0 ? (
        <>
          <p className="text-muted-foreground">
            {describeSleepCounts(summarizeSleep(sessions, day.range, now))}
          </p>
          <SleepHistory
            sessions={sessions}
            day={day.range}
            timeZone={timeZone}
            viewerId={member.userId}
            authorNames={authorNames}
          />
        </>
      ) : (
        <EmptyState
          icon={Moon}
          title={
            day.isToday ? "Aún no hay siestas hoy" : "No hay siestas este día"
          }
          description={
            day.isToday
              ? "Cuando se duerma, inicia una con el botón de abajo."
              : "Si se te olvidó alguna, añádela con su hora."
          }
          iconSurfaceClassName="bg-sleep-soft"
          iconClassName="text-sleep"
        />
      )}
      <Link
        href="/sleep/new"
        className={cn(
          buttonVariants({ variant: "ghost" }),
          "h-12 self-start px-3 text-base",
        )}
      >
        <Plus aria-hidden className="size-5" />
        Añadir con otra hora
      </Link>
      {/* The bar starts siestas "now": only on today. */}
      {day.isToday && (
        <SleepTimerBar
          babyId={baby.id}
          serverNow={now.toISOString()}
          timeZone={timeZone}
          running={
            active
              ? {
                  id: active.id,
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

function SleepSkeleton(): ReactNode {
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
      <Skeleton className="mt-auto h-32 w-full rounded-2xl" />
    </div>
  );
}
