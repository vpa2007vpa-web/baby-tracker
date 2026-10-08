import "server-only";

import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { connection } from "next/server";

import { env } from "@/lib/env";

/**
 * Read-write client for Server Actions and Route Handlers, where Next.js lets
 * us write the auth cookies (sign-in, sign-out).
 */
export async function createSupabaseServerClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();
  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        },
      },
    },
  );
}

/**
 * Read-only client for Server Components, which cannot write cookies.
 * Token refresh happens earlier, in src/proxy.ts, on every request.
 */
export async function createSupabaseReadOnlyServerClient(): Promise<SupabaseClient> {
  // getClaims() reads the clock (Date.now()) to check token expiry whenever a
  // session exists. Cookies alone may be read during Cache Components'
  // runtime prerender, the clock may not: defer session reads to request time.
  await connection();
  const cookieStore = await cookies();
  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
      },
    },
  );
}
