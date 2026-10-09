/**
 * Who logged or edited a record, for "por Ana" (CLAUDE.md §4.4): "ti" for the
 * viewer, the household name of anyone else, or null for someone no longer
 * in the household. Pages build `names` from the household members.
 */
export function authorLabel(
  userId: string,
  viewerId: string,
  names: Readonly<Record<string, string>>,
): string | null {
  if (userId === viewerId) return "ti";
  return names[userId] ?? null;
}
