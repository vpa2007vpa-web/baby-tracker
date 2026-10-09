import { Pill, Syringe } from "lucide-react";
import type { ReactNode } from "react";

import type { HealthRecordKind } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";

/** Decorative: always next to the kind's or the record's name. */
export function HealthKindIcon({
  kind,
  className,
}: {
  kind: HealthRecordKind;
  className?: string;
}): ReactNode {
  const Icon = kind === "VACCINE" ? Syringe : Pill;
  return <Icon aria-hidden className={cn("size-5", className)} />;
}
