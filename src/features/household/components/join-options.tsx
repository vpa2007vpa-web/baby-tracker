import { KeyRound, Users } from "lucide-react";
import type { ReactNode } from "react";

import { LinkCard } from "@/components/shared/link-card";

/** The two onboarding paths as large links: each one is its own screen. */
export function JoinOptions(): ReactNode {
  return (
    <ul className="flex flex-col gap-3">
      <li>
        <LinkCard
          href="/join/create"
          icon={Users}
          title="Crear una familia"
          description="Eres el primero en usar la app."
        />
      </li>
      <li>
        <LinkCard
          href="/join/code"
          icon={KeyRound}
          title="Tengo un código"
          description="Te lo ha enviado el otro progenitor."
        />
      </li>
    </ul>
  );
}
