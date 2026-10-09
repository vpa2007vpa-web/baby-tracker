import type { ReactNode } from "react";

import { requireMember } from "@/features/auth/session";
import { RealtimeSync } from "@/features/sync/components/realtime-sync";

/**
 * Reads the session for RealtimeSync and hands it only the household id:
 * the channel topic, authorized again by the database (realtime.messages
 * policy). Rendered inside a Suspense boundary of the static app layout.
 */
export async function RealtimeSyncLoader(): Promise<ReactNode> {
  const member = await requireMember();
  return <RealtimeSync householdId={member.householdId} />;
}
