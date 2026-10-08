import { UsersRound } from "lucide-react";
import type { ReactNode } from "react";

import type { HouseholdMemberSummary } from "@/features/household/queries";

const NAME_LIST = new Intl.ListFormat("es", { type: "conjunction" });

/** Shown instead of the invite panel once both parents are members. */
export function HouseholdComplete({
  members,
}: {
  members: HouseholdMemberSummary[];
}): ReactNode {
  const names = NAME_LIST.format(members.map((member) => member.displayName));

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-muted p-6">
      <UsersRound aria-hidden className="size-6" />
      <h2 className="text-xl font-semibold">Tu familia está completa</h2>
      <p className="text-muted-foreground">
        Ya sois dos: {names}. No hace falta invitar a nadie más.
      </p>
    </div>
  );
}
