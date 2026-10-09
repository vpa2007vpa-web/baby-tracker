import type { ReactNode } from "react";

import { RemoveMemberButton } from "@/features/household/components/remove-member-button";
import type { HouseholdMemberSummary } from "@/features/household/queries";
import type { HouseholdRole } from "@/generated/prisma/enums";

const ROLE_LABELS: Readonly<Record<HouseholdRole, string>> = {
  OWNER: "Creó la familia",
  MEMBER: "Se unió con un código",
};

type MemberListProps = {
  members: readonly HouseholdMemberSummary[];
  viewerId: string;
  /** Only the OWNER may remove, and only the other member. */
  canRemove: boolean;
};

export function MemberList({
  members,
  viewerId,
  canRemove,
}: MemberListProps): ReactNode {
  return (
    <ul className="flex flex-col divide-y divide-border">
      {members.map((member) => {
        const isViewer = member.userId === viewerId;
        return (
          <li
            key={member.userId}
            className="flex min-h-14 items-center justify-between gap-3 py-2"
          >
            <span className="flex min-w-0 flex-col">
              <span className="truncate font-medium">
                {member.displayName}
                {isViewer && (
                  <span className="font-normal text-muted-foreground">
                    {" "}
                    (tú)
                  </span>
                )}
              </span>
              <span className="text-sm text-muted-foreground">
                {ROLE_LABELS[member.role]}
              </span>
            </span>
            {canRemove && !isViewer && member.role === "MEMBER" && (
              <RemoveMemberButton
                userId={member.userId}
                displayName={member.displayName}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}
