"use client";

import { CalendarDays } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { dayHref } from "@/lib/dates";

type DayPickerProps = {
  /** "Hoy", "Ayer" or "jue 1 oct": what the control shows. */
  label: string;
  basePath: string;
  /** yyyy-MM-dd of the day on screen. */
  date: string;
  /** Today in the household zone: no future days. */
  maxDate: string;
};

/**
 * The day label opens the system date picker (iOS wheel, Android calendar):
 * two weeks back is two taps, not fourteen. A native input, so the picker is
 * accessible and needs no dependency (CLAUDE.md §0.7). The transparent input
 * covers the label, so a tap anywhere on it opens the picker.
 */
export function DayPicker({
  label,
  basePath,
  date,
  maxDate,
}: DayPickerProps): ReactNode {
  const router = useRouter();

  return (
    <label className="relative flex h-12 items-center gap-2 rounded-xl px-3 text-lg font-semibold has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring">
      <CalendarDays aria-hidden className="size-5 text-muted-foreground" />
      <span aria-hidden>{label}</span>
      <input
        type="date"
        value={date}
        max={maxDate}
        required
        aria-label={`${label}, elegir otro día`}
        onClick={(event) => {
          // Desktop browsers open the picker only from its small icon; an
          // older Safari has no showPicker and opens it on tap anyway.
          const input = event.currentTarget;
          if ("showPicker" in input) input.showPicker();
        }}
        onChange={(event) => {
          const picked = event.target.value;
          // An emptied field or a typed future day goes nowhere.
          if (!picked || picked > maxDate) return;
          router.push(dayHref(basePath, picked, maxDate));
        }}
        className="absolute inset-0 cursor-pointer text-base opacity-0"
      />
    </label>
  );
}
