import { Blend, CircleDot, Droplet, type LucideIcon } from "lucide-react";

import type { DiaperType } from "@/generated/prisma/enums";

/** Always next to the type's label: the icons alone are only a hint. */
export const DIAPER_TYPE_ICONS: Readonly<Record<DiaperType, LucideIcon>> = {
  WET: Droplet,
  DIRTY: CircleDot,
  MIXED: Blend,
};
