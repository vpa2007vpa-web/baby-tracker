import { getMemberByUserId, type Member } from "@/features/auth/queries";

/**
 * Session double for Server Action integration tests:
 *
 *   vi.mock("@/features/auth/session", () => import("@/test/session-double"));
 *
 * Set `session.userId` before calling an action. The membership is read from
 * the real database, so authorization is exercised for real.
 */
export const session: { userId: string } = { userId: "" };

export async function requireUserId(): Promise<string> {
  return session.userId;
}

export async function requireMember(): Promise<Member> {
  // Read before the first await: concurrent tests switch `session.userId`
  // between calls.
  const userId = session.userId;
  const member = await getMemberByUserId(userId);
  if (!member) throw new Error("REDIRECT:/join");
  return member;
}
