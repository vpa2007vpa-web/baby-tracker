import type { LucideIcon } from "lucide-react";
import { Baby, Milk, Moon, Ruler, Syringe } from "lucide-react";
import type { ReactNode } from "react";

import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { requireMember } from "@/features/auth/session";
import { InvitePartnerCard } from "@/features/household/components/invite-partner-card";
import { listHouseholdMembers } from "@/features/household/queries";
import { MAX_HOUSEHOLD_MEMBERS } from "@/features/household/service";
import { cn } from "@/lib/utils";

// Temporary signed-in screen for phase 1: replaced by the "Hoy" dashboard in
// phases 3–4. loading.tsx provides the Suspense boundary that
// Cache Components requires around the session read.
const MODULES: ReadonlyArray<{
  label: string;
  icon: LucideIcon;
  surfaceClass: string;
  iconClass: string;
}> = [
  {
    label: "Tomas",
    icon: Milk,
    surfaceClass: "bg-feeding-soft",
    iconClass: "text-feeding",
  },
  {
    label: "Pañales",
    icon: Baby,
    surfaceClass: "bg-diapers-soft",
    iconClass: "text-diapers",
  },
  {
    label: "Sueño",
    icon: Moon,
    surfaceClass: "bg-sleep-soft",
    iconClass: "text-sleep",
  },
  {
    label: "Crecimiento",
    icon: Ruler,
    surfaceClass: "bg-growth-soft",
    iconClass: "text-growth",
  },
  {
    label: "Salud",
    icon: Syringe,
    surfaceClass: "bg-health-soft",
    iconClass: "text-health",
  },
];

export default async function HomePage(): Promise<ReactNode> {
  const member = await requireMember();
  const members = await listHouseholdMembers(member.householdId);
  const canInvite = members.length < MAX_HOUSEHOLD_MEMBERS;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pt-8 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold">Hola, {member.displayName}</h1>
        <p className="text-muted-foreground">
          Todo listo para empezar a registrar.
        </p>
      </header>

      {canInvite && <InvitePartnerCard />}

      <ul className="flex flex-col gap-3">
        {MODULES.map(({ label, icon: Icon, surfaceClass, iconClass }) => (
          <li
            key={label}
            className={cn(
              "flex h-14 items-center gap-3 rounded-2xl px-4",
              surfaceClass,
            )}
          >
            <Icon aria-hidden className={cn("size-6", iconClass)} />
            <span className="text-base font-medium">{label}</span>
          </li>
        ))}
      </ul>

      <div className="mt-auto">
        <SignOutButton />
      </div>
    </main>
  );
}
