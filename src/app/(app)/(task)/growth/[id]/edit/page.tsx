import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { DeleteRecordButton } from "@/components/shared/delete-record-button";
import { FormSkeleton } from "@/components/shared/form-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { requireBaby } from "@/features/auth/session";
import { deleteGrowthMeasurement } from "@/features/growth/actions";
import { EditGrowthForm } from "@/features/growth/components/edit-growth-form";
import { GROWTH_FACTORS, toFormDecimal } from "@/features/growth/labels";
import { getGrowthMeasurement } from "@/features/growth/queries";
import { listHouseholdMembers } from "@/features/household/queries";
import { authorLabel, authorNamesOf, describeAuthorship } from "@/lib/authors";
import { formatDateTimeLocalValue } from "@/lib/dates";
import { env } from "@/lib/env";

export const metadata: Metadata = { title: "Editar medida · Métricas Bebé" };

export default function EditGrowthPage({
  params,
}: PageProps<"/growth/[id]/edit">): ReactNode {
  return (
    <Suspense fallback={<EditGrowthSkeleton />}>
      <EditGrowthSection params={params} />
    </Suspense>
  );
}

async function EditGrowthSection({
  params,
}: Pick<PageProps<"/growth/[id]/edit">, "params">): Promise<ReactNode> {
  const { member, baby } = await requireBaby();
  const { id } = await params;
  const [measurement, members] = await Promise.all([
    getGrowthMeasurement(baby.id, id),
    listHouseholdMembers(member.householdId),
  ]);
  // Missing, malformed or another household's: the same 404 (§2.7).
  if (!measurement) notFound();

  const timeZone = env.APP_TIMEZONE;
  const names = authorNamesOf(members);

  return (
    <>
      <PageHeader
        backHref="/growth"
        title="Editar medida"
        description={describeAuthorship(
          authorLabel(measurement.createdById, member.userId, names),
          measurement.updatedById &&
            authorLabel(measurement.updatedById, member.userId, names),
        )}
      />
      <EditGrowthForm
        timeZone={timeZone}
        defaultValues={{
          id: measurement.id,
          measuredAt: formatDateTimeLocalValue(
            measurement.measuredAt,
            timeZone,
          ),
          weightKg: toFormDecimal(measurement.weightGrams, GROWTH_FACTORS.kg),
          lengthCm: toFormDecimal(measurement.lengthMm, GROWTH_FACTORS.cm),
          headCircumferenceCm: toFormDecimal(
            measurement.headCircumferenceMm,
            GROWTH_FACTORS.cm,
          ),
        }}
      >
        <DeleteRecordButton
          id={measurement.id}
          deleteAction={deleteGrowthMeasurement}
          returnHref="/growth"
          actionLabel="Borrar medida"
          title="¿Borrar esta medida?"
          successMessage="Medida borrada"
        />
      </EditGrowthForm>
    </>
  );
}

function EditGrowthSkeleton(): ReactNode {
  return (
    <>
      <div className="flex flex-col gap-2">
        <Skeleton className="size-12 rounded-full" />
        <Skeleton className="h-9 w-2/3" />
      </div>
      <FormSkeleton fields={4} />
    </>
  );
}
