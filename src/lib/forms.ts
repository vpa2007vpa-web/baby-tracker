import type { FieldValues, Path, UseFormSetError } from "react-hook-form";

/**
 * Copies the server-side `fieldErrors` of an ActionResult onto a React Hook
 * Form (CLAUDE.md §2.4). Returns whether any field error was applied, so the
 * caller can fall back to a toast for form-level errors.
 */
export function applyFieldErrors<T extends FieldValues>(
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
  fieldErrors: Record<string, string[]> | undefined,
): boolean {
  let applied = false;
  for (const [key, messages] of Object.entries(fieldErrors ?? {})) {
    const field = fields.find((candidate) => candidate === key);
    const message = messages[0];
    if (field && message) {
      setError(field, { type: "server", message });
      applied = true;
    }
  }
  return applied;
}
