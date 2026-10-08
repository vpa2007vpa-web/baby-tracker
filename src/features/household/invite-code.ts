// Isomorphic (ADR-043): the join form normalizes what the user types before
// submitting, and the server does the same before hashing.

/** Crockford Base32: no I, L, O or U, so nothing is ambiguous typed or read aloud. */
export const INVITE_CODE_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
export const INVITE_CODE_LENGTH = 10;

const CROCKFORD_ALIASES: Record<string, string> = { O: "0", I: "1", L: "1" };

/** Accepts lowercase, spaces, hyphens and Crockford aliases; null when invalid. */
export function normalizeInviteCode(raw: string): string | null {
  const code = [...raw.toUpperCase().replace(/[\s-]/g, "")]
    .map((char) => CROCKFORD_ALIASES[char] ?? char)
    .join("");
  const isValid =
    code.length === INVITE_CODE_LENGTH &&
    [...code].every((char) => INVITE_CODE_ALPHABET.includes(char));
  return isValid ? code : null;
}

/** "ABCDEFGHJK" → "ABCDE-FGHJK". */
export function formatInviteCode(code: string): string {
  const half = INVITE_CODE_LENGTH / 2;
  return `${code.slice(0, half)}-${code.slice(half)}`;
}
