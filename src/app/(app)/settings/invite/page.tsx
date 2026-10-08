import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { requireMember } from "@/features/auth/session";
import { HouseholdComplete } from "@/features/household/components/household-complete";
import { InviteCodePanel } from "@/features/household/components/invite-code-panel";
import {
  getPendingInvite,
  listHouseholdMembers,
} from "@/features/household/queries";
import { MAX_HOUSEHOLD_MEMBERS } from "@/features/household/service";
import { formatRelativeDayTime } from "@/lib/dates";
import { env } from "@/lib/env";

export const metadata: Metadata = { title: "Invitar · Métricas Bebé" };

// Until the "Más" tab and the Ajustes screen exist, Atrás goes home.
export default function InvitePage(): ReactNode {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-4 pt-8 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <PageHeader backHref="/" title="Invita al otro progenitor" />
      <Suspense fallback={<InviteSkeleton />}>
        <InviteSection />
      </Suspense>
    </main>
  );
}

async function InviteSection(): Promise<ReactNode> {
  const member = await requireMember();
  const now = new Date();
  const [members, pendingInvite] = await Promise.all([
    listHouseholdMembers(member.householdId),
    getPendingInvite(member.householdId, now),
  ]);

  if (members.length >= MAX_HOUSEHOLD_MEMBERS) {
    return <HouseholdComplete members={members} />;
  }
  return (
    <InviteCodePanel
      pendingExpiry={
        pendingInvite &&
        formatRelativeDayTime(pendingInvite.expiresAt, now, env.APP_TIMEZONE)
      }
    />
  );
}

function InviteSkeleton(): ReactNode {
  return (
    <div
      role="status"
      aria-label="Cargando"
      className="flex flex-1 flex-col gap-6"
    >
      <Skeleton className="h-12 w-full" />
      <Skeleton className="mt-auto h-14 w-full rounded-4xl" />
    </div>
  );
}
