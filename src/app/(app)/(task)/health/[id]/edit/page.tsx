import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { DeleteRecordButton } from "@/components/shared/delete-record-button";
import { FormSkeleton } from "@/components/shared/form-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { requireBaby } from "@/features/auth/session";
import { deleteHealthRecord } from "@/features/health/actions";
import { EditHealthForm } from "@/features/health/components/edit-health-form";
import { formatDoseInput } from "@/features/health/labels";
import { getHealthRecord } from "@/features/health/queries";
import { listHouseholdMembers } from "@/features/household/queries";
import { authorLabel, authorNamesOf, describeAuthorship } from "@/lib/authors";
import { formatDateTimeLocalValue } from "@/lib/dates";
import { env } from "@/lib/env";

export const metadata: Metadata = { title: "Editar registro · Métricas Bebé" };

export default function EditHealthPage({
  params,
}: PageProps<"/health/[id]/edit">): ReactNode {
  return (
    <Suspense fallback={<EditHealthSkeleton />}>
      <EditHealthSection params={params} />
    </Suspense>
  );
}

async function EditHealthSection({
  params,
}: Pick<PageProps<"/health/[id]/edit">, "params">): Promise<ReactNode> {
  const { member, baby } = await requireBaby();
  const { id } = await params;
  const [record, members] = await Promise.all([
    getHealthRecord(baby.id, id),
    listHouseholdMembers(member.householdId),
  ]);
  // Missing, malformed or another household's: the same 404 (§2.7).
  if (!record) notFound();

  const timeZone = env.APP_TIMEZONE;
  const names = authorNamesOf(members);
  const isVaccine = record.kind === "VACCINE";

  return (
    <>
      <PageHeader
        backHref="/health"
        title={isVaccine ? "Editar vacuna" : "Editar medicamento"}
        description={describeAuthorship(
          authorLabel(record.createdById, member.userId, names),
          record.updatedById &&
            authorLabel(record.updatedById, member.userId, names),
        )}
      />
      <EditHealthForm
        timeZone={timeZone}
        defaultValues={{
          id: record.id,
          kind: record.kind,
          name: record.name,
          doseAmount: formatDoseInput(record.doseAmount),
          doseUnit: record.doseUnit ?? undefined,
          doseNumber: record.doseNumber ?? undefined,
          administeredAt: formatDateTimeLocalValue(
            record.administeredAt,
            timeZone,
          ),
          reaction: record.reaction ?? "",
          notes: record.notes ?? "",
        }}
      >
        <DeleteRecordButton
          id={record.id}
          deleteAction={deleteHealthRecord}
          returnHref="/health"
          actionLabel={isVaccine ? "Borrar vacuna" : "Borrar medicamento"}
          title={
            isVaccine ? "¿Borrar esta vacuna?" : "¿Borrar este medicamento?"
          }
          successMessage={isVaccine ? "Vacuna borrada" : "Medicamento borrado"}
        />
      </EditHealthForm>
    </>
  );
}

function EditHealthSkeleton(): ReactNode {
  return (
    <>
      <div className="flex flex-col gap-2">
        <Skeleton className="size-12 rounded-full" />
        <Skeleton className="h-9 w-2/3" />
      </div>
      <FormSkeleton fields={5} />
    </>
  );
}
