import { Ruler, Settings, Syringe } from "lucide-react";
import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { LinkCard } from "@/components/shared/link-card";
import { Skeleton } from "@/components/ui/skeleton";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { requireMember } from "@/features/auth/session";
import { InvitePartnerCard } from "@/features/household/components/invite-partner-card";
import { listHouseholdMembers } from "@/features/household/queries";
import { MAX_HOUSEHOLD_MEMBERS } from "@/features/household/service";

export const metadata: Metadata = { title: "Más · Métricas Bebé" };

// A screen of large cards, not a hidden menu (CLAUDE.md §4.3).
export default function MorePage(): ReactNode {
  return (
    <>
      <PageHeader title="Más" />
      <Suspense fallback={<MoreSkeleton />}>
        <MoreSection />
      </Suspense>
    </>
  );
}

async function MoreSection(): Promise<ReactNode> {
  const member = await requireMember();
  const members = await listHouseholdMembers(member.householdId);
  const canInvite = members.length < MAX_HOUSEHOLD_MEMBERS;

  return (
    <div className="flex flex-1 flex-col gap-6">
      <ul className="flex flex-col gap-3">
        <li>
          <LinkCard
            href="/growth"
            icon={Ruler}
            title="Crecimiento"
            description="Peso, longitud y perímetro craneal."
            iconSurfaceClassName="bg-growth-soft"
            iconClassName="text-growth"
          />
        </li>
        <li>
          <LinkCard
            href="/health"
            icon={Syringe}
            title="Salud"
            description="Vacunas y medicamentos."
            iconSurfaceClassName="bg-health-soft"
            iconClassName="text-health"
          />
        </li>
        {canInvite && (
          <li>
            <InvitePartnerCard />
          </li>
        )}
        <li>
          <LinkCard
            href="/settings"
            icon={Settings}
            title="Ajustes"
            description="Tu familia y la app."
          />
        </li>
      </ul>
      <div className="mt-auto">
        <SignOutButton />
      </div>
    </div>
  );
}

function MoreSkeleton(): ReactNode {
  return (
    <div role="status" aria-label="Cargando" className="flex flex-col gap-3">
      {Array.from({ length: 3 }, (_, index) => (
        <Skeleton key={index} className="h-20 w-full rounded-2xl" />
      ))}
    </div>
  );
}
