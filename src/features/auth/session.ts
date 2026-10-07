import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { getMemberByUserId, type Member } from "@/features/auth/queries";
import { createSupabaseReadOnlyServerClient } from "@/lib/supabase/server";

export type { Member } from "@/features/auth/queries";

/**
 * Verified Supabase Auth user id, or null. Uses getClaims(), which validates
 * the JWT; never getSession() on the server (CLAUDE.md §2.7). Cached per request.
 */
export const getSessionUserId = cache(async (): Promise<string | null> => {
  const supabase = await createSupabaseReadOnlyServerClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data) return null;
  const { sub } = data.claims;
  return typeof sub === "string" ? sub : null;
});

const getMemberForUser = cache(getMemberByUserId);

/**
 * Entry point of every authenticated page and Server Action. Redirects to the
 * login without a session, and to /join when the user has no household yet.
 * redirect() throws, so call it outside any try/catch.
 */
export async function requireMember(): Promise<Member> {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  const member = await getMemberForUser(userId);
  if (!member) redirect("/join");

  return member;
}
