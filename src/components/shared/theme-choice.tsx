"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore, type ReactNode } from "react";

import { ChoiceGrid } from "@/components/shared/choice-grid";
import { Skeleton } from "@/components/ui/skeleton";

const THEMES = [
  { value: "system", label: "Sistema", Icon: Monitor },
  { value: "light", label: "Claro", Icon: Sun },
  { value: "dark", label: "Oscuro", Icon: Moon },
] as const;

type Theme = (typeof THEMES)[number]["value"];

function isTheme(value: string | undefined): value is Theme {
  return THEMES.some((theme) => theme.value === value);
}

function subscribe(): () => void {
  return () => {};
}

/**
 * The manual switch of decision 022, next to "follow the system". The
 * stored choice lives in the browser (next-themes), so the server cannot
 * render it: a placeholder of the same size until hydration avoids a
 * mismatch.
 */
export function ThemeChoice(): ReactNode {
  const { theme, setTheme } = useTheme();
  const isHydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

  if (!isHydrated) {
    return <Skeleton className="h-28 w-full rounded-xl" />;
  }
  return (
    <ChoiceGrid
      legend="Tema"
      name="theme"
      columns={3}
      value={isTheme(theme) ? theme : "system"}
      onChange={setTheme}
      options={THEMES.map(({ value, label, Icon }) => ({
        value,
        label,
        visual: <Icon aria-hidden className="size-5 shrink-0" />,
      }))}
    />
  );
}
