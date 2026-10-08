import { UserPlus } from "lucide-react";
import type { ReactNode } from "react";

import { LinkCard } from "@/components/shared/link-card";

/** Home prompt while the household has a single member (not blocking). */
export function InvitePartnerCard(): ReactNode {
  return (
    <LinkCard
      href="/settings/invite"
      icon={UserPlus}
      title="Invita al otro progenitor"
      description="Así los dos veréis lo mismo al momento."
    />
  );
}
