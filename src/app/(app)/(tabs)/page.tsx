import { CalendarDays } from "lucide-react";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { requireMember } from "@/features/auth/session";
import { InvitePartnerCard } from "@/features/household/components/invite-partner-card";
import { listHouseholdMembers } from "@/features/household/queries";
import { MAX_HOUSEHOLD_MEMBERS } from "@/features/household/service";

export const metadata: Metadata = { title: "Hoy · Métricas Bebé" };

// "Hoy" until the dashboard (phase 4). loading.tsx provides the Suspense
// boundary that Cache Components requires around the session read.
export default async function TodayPage(): Promise<ReactNode> {
  const member = await requireMember();
  const members = await listHouseholdMembers(member.householdId);
  const canInvite = members.length < MAX_HOUSEHOLD_MEMBERS;

  return (
    <>
      <PageHeader
        title={`Hola, ${member.displayName}`}
        description="Todo listo para empezar a registrar."
      />
      {canInvite && <InvitePartnerCard />}
      <EmptyState
        icon={CalendarDays}
        title="El resumen del día, muy pronto"
        description="Aquí verás de un vistazo la última toma, los pañales y el sueño de hoy."
      />
    </>
  );
}
