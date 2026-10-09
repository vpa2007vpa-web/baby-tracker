import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { FormSkeleton } from "@/components/shared/form-skeleton";
import { requireBaby } from "@/features/auth/session";
import { NewFeedingForm } from "@/features/feeding/components/new-feeding-form";
import {
  getLastBottleFeeding,
  getLastBreastFeeding,
} from "@/features/feeding/queries";
import { suggestNextBreast } from "@/features/feeding/service";
import { formatDateTimeLocalValue } from "@/lib/dates";
import { env } from "@/lib/env";

export const metadata: Metadata = { title: "Nueva toma · Métricas Bebé" };

/** A breast feeding typed by hand usually ended just now, after ~15 min. */
const DEFAULT_BREAST_MINUTES = 15;

export default function NewFeedingPage({
  searchParams,
}: PageProps<"/feeding/new">): ReactNode {
  return (
    <>
      <PageHeader backHref="/feeding" title="Nueva toma" />
      <Suspense fallback={<FormSkeleton fields={3} />}>
        <NewFeedingSection searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function NewFeedingSection({
  searchParams,
}: Pick<PageProps<"/feeding/new">, "searchParams">): Promise<ReactNode> {
  const { baby } = await requireBaby();
  const { type } = await searchParams;
  const [lastBottle, lastBreast] = await Promise.all([
    getLastBottleFeeding(baby.id),
    getLastBreastFeeding(baby.id),
  ]);
  const timeZone = env.APP_TIMEZONE;
  const now = new Date();
  // "Biberón" in the bar opens ?type=BOTTLE; otherwise the suggested breast.
  const isBottle = type === "BOTTLE";
  const startedAt = isBottle
    ? now
    : new Date(now.getTime() - DEFAULT_BREAST_MINUTES * 60_000);

  return (
    <NewFeedingForm
      babyId={baby.id}
      timeZone={timeZone}
      defaults={{
        type: isBottle ? "BOTTLE" : suggestNextBreast(lastBreast?.type ?? null),
        startedAt: formatDateTimeLocalValue(startedAt, timeZone),
        endedAt: formatDateTimeLocalValue(now, timeZone),
        amountMl: lastBottle?.amountMl,
        bottleContent: lastBottle?.bottleContent,
      }}
    />
  );
}
