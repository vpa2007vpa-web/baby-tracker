import "server-only";

import { z } from "zod";

import { readPrismaCode } from "@/lib/action-result";

/**
 * Idempotent create keyed by the client-generated UUID (CLAUDE.md §2.3,
 * decision 016). A unique violation is either a retry of this same insert
 * (a double tap, a network retry) or another unique index such as "one
 * active timer per baby". `findOwn` tells them apart: it must look the id up
 * inside the caller's household, so another family's record is never
 * returned. Returns the row, or null for a conflict; any other error
 * propagates to the action's handleActionError.
 */
export async function insertOnce<T>(
  insert: () => Promise<T>,
  findOwn: () => Promise<T | null>,
): Promise<T | null> {
  try {
    return await insert();
  } catch (error) {
    if (readPrismaCode(error) !== "P2002") throw error;
    return findOwn();
  }
}

const uuidSchema = z.uuid();

/** Ids come from URLs and forms: a malformed one must read as "not found". */
export function isUuid(value: string): boolean {
  return uuidSchema.safeParse(value).success;
}

/**
 * How far before a day the session listings (sleep, breast feedings) look
 * for sessions that spill into it, so the (baby_id, started_at) index scans a
 * bounded range. It covers every hand-typed session (at most 16 h); a running
 * session is matched on its own, however old.
 */
export const SESSION_LOOKBACK_MS = 24 * 60 * 60 * 1000;
