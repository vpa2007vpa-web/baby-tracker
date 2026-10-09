import { Baby, Milk, Moon, Ruler } from "lucide-react";
import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { DayNav } from "@/components/shared/day-nav";
import { Skeleton } from "@/components/ui/skeleton";
import { requireBaby } from "@/features/auth/session";
import { LastFeedingCard } from "@/features/dashboard/components/last-feeding-card";
import { RunningTimerCard } from "@/features/dashboard/components/running-timer-card";
import { SummaryCard } from "@/features/dashboard/components/summary-card";
import {
  describeDiaperTotals,
  describeFeedingTotals,
  describeSleepTotals,
} from "@/features/dashboard/labels";
import { getDailySummary } from "@/features/dashboard/queries";
import {
  describeLastFeeding,
  FEEDING_TYPE_LABELS,
} from "@/features/feeding/labels";
import {
  getActiveFeeding,
  getLastBreastFeeding,
  getLastFeeding,
} from "@/features/feeding/queries";
import { suggestNextBreast } from "@/features/feeding/service";
import { formatWeight } from "@/features/growth/labels";
import { getLatestGrowthMeasurement } from "@/features/growth/queries";
import { InvitePartnerCard } from "@/features/household/components/invite-partner-card";
import { listHouseholdMembers } from "@/features/household/queries";
import { MAX_HOUSEHOLD_MEMBERS } from "@/features/household/service";
import { getActiveSleepSession } from "@/features/sleep/queries";
import { authorLabel, authorNamesOf } from "@/lib/authors";
import {
  dayNavHrefs,
  formatDayLabel,
  formatShortDate,
  resolveDay,
} from "@/lib/dates";
import { env } from "@/lib/env";

export const metadata: Metadata = { title: "Hoy · Métricas Bebé" };

export default function TodayPage({ searchParams }: PageProps<"/">): ReactNode {
  return (
    <>
      <PageHeader title="Hoy" />
      <Suspense fallback={<TodaySkeleton />}>
        <TodaySection searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function TodaySection({
  searchParams,
}: Pick<PageProps<"/">, "searchParams">): Promise<ReactNode> {
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
  // Past days show the summary only (decision D4).
  const today = day.isToday;
  const [
    summary,
    members,
    lastFeeding,
    lastBreast,
    activeFeeding,
    activeSleep,
    latestGrowth,
  ] = await Promise.all([
    getDailySummary(baby.id, day.range, now),
    listHouseholdMembers(member.householdId),
    today ? getLastFeeding(baby.id) : null,
    today ? getLastBreastFeeding(baby.id) : null,
    today ? getActiveFeeding(baby.id) : null,
    today ? getActiveSleepSession(baby.id) : null,
    today ? getLatestGrowthMeasurement(baby.id) : null,
  ]);
  const names = authorNamesOf(members);
  const serverNow = now.toISOString();
  const dayQuery = today ? "" : `?day=${day.date}`;
  // The running feeding already has its own card.
  const showLastFeeding = lastFeeding && lastFeeding.id !== activeFeeding?.id;

  return (
    <div className="flex flex-1 flex-col gap-4">
      <DayNav
        label={formatDayLabel(day, now, timeZone)}
        {...dayNavHrefs("/", day, now, timeZone)}
      />
      {today && members.length < MAX_HOUSEHOLD_MEMBERS && <InvitePartnerCard />}
      {(activeFeeding || activeSleep) && (
        <section
          aria-labelledby="running-title"
          className="flex flex-col gap-3"
        >
          <h2 id="running-title" className="text-lg font-semibold">
            En curso
          </h2>
          {activeFeeding && activeFeeding.type !== "BOTTLE" && (
            <RunningTimerCard
              id={activeFeeding.id}
              href="/feeding"
              icon={Milk}
              title={`${FEEDING_TYPE_LABELS[activeFeeding.type]} en curso`}
              startedAt={activeFeeding.startedAt.toISOString()}
              serverNow={serverNow}
              startedBy={authorLabel(
                activeFeeding.createdById,
                member.userId,
                names,
              )}
              surfaceClassName="bg-feeding-soft"
              iconClassName="text-feeding"
            />
          )}
          {activeSleep && (
            <RunningTimerCard
              id={activeSleep.id}
              href="/sleep"
              icon={Moon}
              title="Durmiendo"
              startedAt={activeSleep.startedAt.toISOString()}
              serverNow={serverNow}
              startedBy={authorLabel(
                activeSleep.createdById,
                member.userId,
                names,
              )}
              surfaceClassName="bg-sleep-soft"
              iconClassName="text-sleep"
            />
          )}
        </section>
      )}
      {showLastFeeding && (
        <LastFeedingCard
          description={describeLastFeeding(lastFeeding)}
          startedAt={lastFeeding.startedAt.toISOString()}
          serverNow={serverNow}
          author={authorLabel(lastFeeding.createdById, member.userId, names)}
          nextBreast={
            activeFeeding
              ? null
              : FEEDING_TYPE_LABELS[
                  suggestNextBreast(lastBreast?.type ?? null)
                ].toLowerCase()
          }
        />
      )}
      <section aria-labelledby="summary-title" className="flex flex-col gap-3">
        <h2 id="summary-title" className="text-lg font-semibold">
          {today ? "Resumen de hoy" : "Resumen del día"}
        </h2>
        <SummaryCard
          href={`/feeding${dayQuery}`}
          icon={Milk}
          title="Tomas"
          text={describeFeedingTotals(summary.feedings)}
          iconSurfaceClassName="bg-feeding-soft"
          iconClassName="text-feeding"
        />
        <SummaryCard
          href={`/diapers${dayQuery}`}
          icon={Baby}
          title="Pañales"
          text={describeDiaperTotals(summary.diapers)}
          iconSurfaceClassName="bg-diapers-soft"
          iconClassName="text-diapers"
        />
        <SummaryCard
          href={`/sleep${dayQuery}`}
          icon={Moon}
          title="Sueño"
          text={describeSleepTotals(summary.sleep)}
          iconSurfaceClassName="bg-sleep-soft"
          iconClassName="text-sleep"
        />
        {latestGrowth?.weightGrams != null && (
          <SummaryCard
            href="/growth"
            icon={Ruler}
            title="Crecimiento"
            text={{
              value: formatWeight(latestGrowth.weightGrams),
              unit: "",
              details: [
                `Último peso, ${formatShortDate(latestGrowth.measuredAt, now, timeZone)}`,
              ],
            }}
            iconSurfaceClassName="bg-growth-soft"
            iconClassName="text-growth"
          />
        )}
      </section>
    </div>
  );
}

function TodaySkeleton(): ReactNode {
  return (
    <div
      role="status"
      aria-label="Cargando"
      className="flex flex-1 flex-col gap-4"
    >
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-32 w-full rounded-2xl" />
      {Array.from({ length: 3 }, (_, index) => (
        <Skeleton key={index} className="h-24 w-full rounded-2xl" />
      ))}
    </div>
  );
}
