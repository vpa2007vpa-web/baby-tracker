import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { publicEnv } from "@/lib/public-env";

/**
 * Browser client, only for Supabase Realtime (RealtimeSync, phase 4).
 * Never used to read or write app data (CLAUDE.md §2.1, §2.3).
 */
export function createSupabaseBrowserClient(): SupabaseClient {
  return createBrowserClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}
