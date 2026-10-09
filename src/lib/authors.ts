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

/**
 * "Registrado por Ana · editado por Luis" for an edit screen (CLAUDE.md
 * §2.6: last write wins, showing who edited last). Undefined when nobody
 * is known.
 */
export function describeAuthorship(
  createdBy: string | null,
  updatedBy: string | null,
): string | undefined {
  const parts = [
    createdBy && `registrado por ${createdBy}`,
    updatedBy && `editado por ${updatedBy}`,
  ].filter((part): part is string => Boolean(part));
  const text = parts.join(" · ");
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : undefined;
}
