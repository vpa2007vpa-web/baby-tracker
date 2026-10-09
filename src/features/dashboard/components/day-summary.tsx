import { Baby, Milk, Moon, Ruler } from "lucide-react";
import type { ReactNode } from "react";

import { SummaryCard } from "@/features/dashboard/components/summary-card";
import {
  describeDiaperTotals,
  describeFeedingTotals,
  describeSleepTotals,
} from "@/features/dashboard/labels";
import type { DailySummary } from "@/features/dashboard/service";

type DaySummaryProps = {
  summary: DailySummary;
  isToday: boolean;
  /** "?day=2026-10-08" on a past day, so each card opens that day. */
  dayQuery: string;
  /** "5,25 kg" and "Último peso, 9 oct", today only. */
  latestWeight: { value: string; detail: string } | null;
};

/** The day's totals, one card per module (accesses to every record). */
export function DaySummary({
  summary,
  isToday,
  dayQuery,
  latestWeight,
}: DaySummaryProps): ReactNode {
  return (
    <section aria-labelledby="summary-title" className="flex flex-col gap-3">
      <h2 id="summary-title" className="text-lg font-semibold">
        {isToday ? "Resumen de hoy" : "Resumen del día"}
      </h2>
      <SummaryCard
        href={`/feeding${dayQuery}`}
        icon={Milk}
        title="Tomas"
        text={describeFeedingTotals(summary.feedings)}
        iconSurfaceClassName="bg-feeding-soft"
        iconClassName="text-feeding"
      />
      <SummaryCard
        href={`/diapers${dayQuery}`}
        icon={Baby}
        title="Pañales"
        text={describeDiaperTotals(summary.diapers)}
        iconSurfaceClassName="bg-diapers-soft"
        iconClassName="text-diapers"
      />
      <SummaryCard
        href={`/sleep${dayQuery}`}
        icon={Moon}
        title="Sueño"
        text={describeSleepTotals(summary.sleep)}
        iconSurfaceClassName="bg-sleep-soft"
        iconClassName="text-sleep"
      />
      {latestWeight && (
        <SummaryCard
          href="/growth"
          icon={Ruler}
          title="Crecimiento"
          text={{
            value: latestWeight.value,
            unit: "",
            details: [latestWeight.detail],
          }}
          iconSurfaceClassName="bg-growth-soft"
          iconClassName="text-growth"
        />
      )}
    </section>
  );
}
