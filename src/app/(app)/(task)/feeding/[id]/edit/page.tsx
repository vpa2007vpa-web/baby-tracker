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
import { deleteFeeding } from "@/features/feeding/actions";
import { EditFeedingForm } from "@/features/feeding/components/edit-feeding-form";
import { getFeeding } from "@/features/feeding/queries";
import { listHouseholdMembers } from "@/features/household/queries";
import { authorLabel, describeAuthorship } from "@/lib/authors";
import {
  formatDateInputValue,
  formatDateTimeLocalValue,
  resolveDay,
} from "@/lib/dates";
import { env } from "@/lib/env";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Editar toma · Métricas Bebé" };

export default function EditFeedingPage({
  params,
}: PageProps<"/feeding/[id]/edit">): ReactNode {
  return (
    <Suspense fallback={<EditFeedingSkeleton />}>
      <EditFeedingSection params={params} />
    </Suspense>
  );
}

async function EditFeedingSection({
  params,
}: Pick<PageProps<"/feeding/[id]/edit">, "params">): Promise<ReactNode> {
  const { member, baby } = await requireBaby();
  const { id } = await params;
  const [feeding, members] = await Promise.all([
    getFeeding(baby.id, id),
    listHouseholdMembers(member.householdId),
  ]);
  // Missing, malformed or another household's: the same 404 (§2.7).
  if (!feeding) notFound();

  // A running feeding is only stopped, from the bar (decision 051).
  if (feeding.type !== "BOTTLE" && !feeding.endedAt) {
    return (
      <>
        <PageHeader
          backHref="/feeding"
          title="Toma en curso"
          description="Para la toma antes de editarla."
        />
        <Link
          href="/feeding"
          className={cn(
            buttonVariants({ size: "lg" }),
            "mt-auto h-14 w-full text-base",
          )}
        >
          Ir a Tomas
        </Link>
      </>
    );
  }

  const timeZone = env.APP_TIMEZONE;
  const names = Object.fromEntries(
    members.map(({ userId, displayName }) => [userId, displayName]),
  );
  // Back to the history of the feeding's own day.
  const day = formatDateInputValue(feeding.startedAt, timeZone);
  const returnHref =
    day === resolveDay(undefined, new Date(), timeZone).date
      ? "/feeding"
      : `/feeding?day=${day}`;
  const startedAt = formatDateTimeLocalValue(feeding.startedAt, timeZone);

  return (
    <>
      <PageHeader
        backHref={returnHref}
        title="Editar toma"
        description={describeAuthorship(
          authorLabel(feeding.createdById, member.userId, names),
          feeding.updatedById &&
            authorLabel(feeding.updatedById, member.userId, names),
        )}
      />
      <EditFeedingForm
        timeZone={timeZone}
        returnHref={returnHref}
        defaultValues={
          feeding.type === "BOTTLE"
            ? {
                id: feeding.id,
                type: feeding.type,
                startedAt,
                amountMl: feeding.amountMl ?? undefined,
                bottleContent: feeding.bottleContent ?? undefined,
                notes: feeding.notes ?? "",
              }
            : {
                id: feeding.id,
                type: feeding.type,
                startedAt,
                endedAt: feeding.endedAt
                  ? formatDateTimeLocalValue(feeding.endedAt, timeZone)
                  : "",
                notes: feeding.notes ?? "",
              }
        }
      >
        <DeleteRecordButton
          id={feeding.id}
          deleteAction={deleteFeeding}
          returnHref={returnHref}
          actionLabel="Borrar toma"
          title="¿Borrar esta toma?"
          successMessage="Toma borrada"
        />
      </EditFeedingForm>
    </>
  );
}

function EditFeedingSkeleton(): ReactNode {
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
