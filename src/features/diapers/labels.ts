import type {
  DiaperType,
  StoolColor,
  StoolConsistency,
} from "@/generated/prisma/enums";

// Spanish UI texts of the diaper enums. Isomorphic and exhaustive: a new
// enum value fails to compile until it has a label.

export const DIAPER_TYPE_LABELS: Readonly<Record<DiaperType, string>> = {
  WET: "Mojado",
  DIRTY: "Sucio",
  MIXED: "Mixto",
};

export const STOOL_COLOR_LABELS: Readonly<Record<StoolColor, string>> = {
  YELLOW: "Amarillo",
  GREEN: "Verde",
  BROWN: "Marrón",
  ORANGE: "Naranja",
  BLACK: "Negro",
  RED: "Rojo",
  PALE: "Blanco o muy pálido",
};

/** Form order: the usual colors of a baby's stool first. */
export const STOOL_COLOR_ORDER: readonly StoolColor[] = [
  "YELLOW",
  "GREEN",
  "BROWN",
  "ORANGE",
  "BLACK",
  "RED",
  "PALE",
];

export const STOOL_CONSISTENCY_LABELS: Readonly<
  Record<StoolConsistency, string>
> = {
  WATERY: "Líquida",
  SEEDY: "Grumosa",
  SOFT: "Blanda",
  FORMED: "Formada",
  HARD: "Dura",
};

/** Form order: from the most liquid to the hardest. */
export const STOOL_CONSISTENCY_ORDER: readonly StoolConsistency[] = [
  "WATERY",
  "SEEDY",
  "SOFT",
  "FORMED",
  "HARD",
];

function plural(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

/** "6 pañales · 5 mojados · 2 sucios"; zero dirty diapers is worth seeing too. */
export function describeDiaperCounts(counts: {
  total: number;
  wet: number;
  dirty: number;
}): string {
  return [
    plural(counts.total, "pañal", "pañales"),
    plural(counts.wet, "mojado", "mojados"),
    plural(counts.dirty, "sucio", "sucios"),
  ].join(" · ");
}
