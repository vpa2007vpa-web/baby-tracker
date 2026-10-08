import "server-only";

import { createHash, randomInt } from "node:crypto";

import {
  INVITE_CODE_ALPHABET,
  INVITE_CODE_LENGTH,
} from "@/features/household/invite-code";

/** ADR-043: short exposure that still covers "I'll send it, enter it tonight". */
export const INVITE_TTL_MS = 24 * 60 * 60 * 1000;
/** ADR-043: the two parents. Caregivers with limited access are in the backlog. */
export const MAX_HOUSEHOLD_MEMBERS = 2;

/**
 * 50 bits from the OS CSPRNG. `randomInt` rejects biased samples, so every
 * character is uniform; the parameter only exists for deterministic tests.
 */
export function generateInviteCode(
  randomIndex: (max: number) => number = (max) => randomInt(0, max),
): string {
  return Array.from({ length: INVITE_CODE_LENGTH }, () =>
    INVITE_CODE_ALPHABET.charAt(randomIndex(INVITE_CODE_ALPHABET.length)),
  ).join("");
}

/** Only this hash is stored: a leaked table or log never yields a usable code. */
export function hashInviteCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

export function getInviteExpiry(now: Date): Date {
  return new Date(now.getTime() + INVITE_TTL_MS);
}
