import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { FormSkeleton } from "@/components/shared/form-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { requireBaby } from "@/features/auth/session";
import { DeleteDiaperButton } from "@/features/diapers/components/delete-diaper-button";
import { EditDiaperForm } from "@/features/diapers/components/edit-diaper-form";
import { getDiaperChange } from "@/features/diapers/queries";
import { listHouseholdMembers } from "@/features/household/queries";
import { authorLabel, describeAuthorship } from "@/lib/authors";
import {
  formatDateInputValue,
  formatDateTimeLocalValue,
  resolveDay,
} from "@/lib/dates";
import { env } from "@/lib/env";

export const metadata: Metadata = { title: "Editar pañal · Métricas Bebé" };

export default function EditDiaperPage({
  params,
}: PageProps<"/diapers/[id]/edit">): ReactNode {
  return (
    <Suspense fallback={<EditDiaperSkeleton />}>
      <EditDiaperSection params={params} />
    </Suspense>
  );
}

async function EditDiaperSection({
  params,
}: Pick<PageProps<"/diapers/[id]/edit">, "params">): Promise<ReactNode> {
  const { member, baby } = await requireBaby();
  const { id } = await params;
  const [diaper, members] = await Promise.all([
    getDiaperChange(baby.id, id),
    listHouseholdMembers(member.householdId),
  ]);
  // Missing, malformed or another household's: the same 404 (§2.7).
  if (!diaper) notFound();

  const timeZone = env.APP_TIMEZONE;
  const names = Object.fromEntries(
    members.map(({ userId, displayName }) => [userId, displayName]),
  );
  // Back to the history of the diaper's own day.
  const day = formatDateInputValue(diaper.occurredAt, timeZone);
  const returnHref =
    day === resolveDay(undefined, new Date(), timeZone).date
      ? "/diapers"
      : `/diapers?day=${day}`;

  return (
    <>
      <PageHeader
        backHref={returnHref}
        title="Editar pañal"
        description={describeAuthorship(
          authorLabel(diaper.createdById, member.userId, names),
          diaper.updatedById &&
            authorLabel(diaper.updatedById, member.userId, names),
        )}
      />
      <EditDiaperForm
        timeZone={timeZone}
        returnHref={returnHref}
        defaultValues={{
          id: diaper.id,
          type: diaper.type,
          occurredAt: formatDateTimeLocalValue(diaper.occurredAt, timeZone),
          stoolColor: diaper.stoolColor ?? undefined,
          stoolConsistency: diaper.stoolConsistency ?? undefined,
          notes: diaper.notes ?? "",
        }}
      >
        <DeleteDiaperButton id={diaper.id} returnHref={returnHref} />
      </EditDiaperForm>
    </>
  );
}

function EditDiaperSkeleton(): ReactNode {
  return (
    <>
      <div className="flex flex-col gap-2">
        <Skeleton className="size-12 rounded-full" />
        <Skeleton className="h-9 w-2/3" />
      </div>
      <FormSkeleton fields={3} />
    </>
  );
}
