import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { FormSkeleton } from "@/components/shared/form-skeleton";
import { requireBaby } from "@/features/auth/session";
import { NewSleepForm } from "@/features/sleep/components/new-sleep-form";
import { formatDateTimeLocalValue } from "@/lib/dates";
import { env } from "@/lib/env";

export const metadata: Metadata = { title: "Nueva siesta · Métricas Bebé" };

/** A siesta typed by hand usually ended just now, after about an hour. */
const DEFAULT_SLEEP_MINUTES = 60;

export default function NewSleepPage(): ReactNode {
  return (
    <>
      <PageHeader backHref="/sleep" title="Nueva siesta" />
      <Suspense fallback={<FormSkeleton fields={3} />}>
        <NewSleepSection />
      </Suspense>
    </>
  );
}

async function NewSleepSection(): Promise<ReactNode> {
  const { baby } = await requireBaby();
  const timeZone = env.APP_TIMEZONE;
  const now = new Date();
  const startedAt = new Date(now.getTime() - DEFAULT_SLEEP_MINUTES * 60_000);

  return (
    <NewSleepForm
      babyId={baby.id}
      timeZone={timeZone}
      defaults={{
        startedAt: formatDateTimeLocalValue(startedAt, timeZone),
        endedAt: formatDateTimeLocalValue(now, timeZone),
      }}
    />
  );
}
