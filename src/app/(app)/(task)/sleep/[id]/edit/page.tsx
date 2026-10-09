import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { DeleteRecordButton } from "@/components/shared/delete-record-button";
import { FormSkeleton } from "@/components/shared/form-skeleton";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { requireBaby } from "@/features/auth/session";
import { listHouseholdMembers } from "@/features/household/queries";
import { deleteSleepSession } from "@/features/sleep/actions";
import { EditSleepForm } from "@/features/sleep/components/edit-sleep-form";
import { getSleepSession } from "@/features/sleep/queries";
import { authorLabel, authorNamesOf, describeAuthorship } from "@/lib/authors";
import {
  formatDateInputValue,
  formatDateTimeLocalValue,
  resolveDay,
} from "@/lib/dates";
import { env } from "@/lib/env";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Editar siesta · Métricas Bebé" };

export default function EditSleepPage({
  params,
}: PageProps<"/sleep/[id]/edit">): ReactNode {
  return (
    <Suspense fallback={<EditSleepSkeleton />}>
      <EditSleepSection params={params} />
    </Suspense>
  );
}

async function EditSleepSection({
  params,
}: Pick<PageProps<"/sleep/[id]/edit">, "params">): Promise<ReactNode> {
  const { member, baby } = await requireBaby();
  const { id } = await params;
  const [session, members] = await Promise.all([
    getSleepSession(baby.id, id),
    listHouseholdMembers(member.householdId),
  ]);
  // Missing, malformed or another household's: the same 404 (§2.7).
  if (!session) notFound();

  // A running siesta is only stopped, from the bar (decision 051).
  if (!session.endedAt) {
    return (
      <>
        <PageHeader
          backHref="/sleep"
          title="Siesta en curso"
          description="Para la siesta antes de editarla."
        />
        <Link
          href="/sleep"
          className={cn(
            buttonVariants({ size: "lg" }),
            "mt-auto h-14 w-full text-base",
          )}
        >
          Ir a Sueño
        </Link>
      </>
    );
  }

  const timeZone = env.APP_TIMEZONE;
  const names = authorNamesOf(members);
  // Back to the history of the day the siesta began.
  const day = formatDateInputValue(session.startedAt, timeZone);
  const returnHref =
    day === resolveDay(undefined, new Date(), timeZone).date
      ? "/sleep"
      : `/sleep?day=${day}`;

  return (
    <>
      <PageHeader
        backHref={returnHref}
        title="Editar siesta"
        description={describeAuthorship(
          authorLabel(session.createdById, member.userId, names),
          session.updatedById &&
            authorLabel(session.updatedById, member.userId, names),
        )}
      />
      <EditSleepForm
        timeZone={timeZone}
        returnHref={returnHref}
        defaultValues={{
          id: session.id,
          startedAt: formatDateTimeLocalValue(session.startedAt, timeZone),
          endedAt: formatDateTimeLocalValue(session.endedAt, timeZone),
          notes: session.notes ?? "",
        }}
      >
        <DeleteRecordButton
          id={session.id}
          deleteAction={deleteSleepSession}
          returnHref={returnHref}
          actionLabel="Borrar siesta"
          title="¿Borrar esta siesta?"
          successMessage="Siesta borrada"
        />
      </EditSleepForm>
    </>
  );
}

function EditSleepSkeleton(): ReactNode {
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
