import {
  Baby,
  Ellipsis,
  House,
  type LucideIcon,
  Milk,
  Moon,
} from "lucide-react";

export type NavItemId = "today" | "feeding" | "diapers" | "sleep" | "more";

export type NavItem = {
  id: NavItemId;
  href: string;
  label: string;
  icon: LucideIcon;
  // Full class names, never built at runtime: Tailwind only generates the
  // classes it can read in the source. Module tabs use their module color
  // (CLAUDE.md §4.4), always next to the icon and the label.
  activeIndicatorClass: string;
  activeIconClass: string;
};

/** The five destinations of the bottom bar (CLAUDE.md §4.2). */
export const NAV_ITEMS: readonly NavItem[] = [
  {
    id: "today",
    href: "/",
    label: "Hoy",
    icon: House,
    activeIndicatorClass: "bg-muted",
    activeIconClass: "text-foreground",
  },
  {
    id: "feeding",
    href: "/feeding",
    label: "Tomas",
    icon: Milk,
    activeIndicatorClass: "bg-feeding-soft",
    activeIconClass: "text-feeding",
  },
  {
    id: "diapers",
    href: "/diapers",
    label: "Pañales",
    icon: Baby,
    activeIndicatorClass: "bg-diapers-soft",
    activeIconClass: "text-diapers",
  },
  {
    id: "sleep",
    href: "/sleep",
    label: "Sueño",
    icon: Moon,
    activeIndicatorClass: "bg-sleep-soft",
    activeIconClass: "text-sleep",
  },
  {
    id: "more",
    href: "/more",
    label: "Más",
    icon: Ellipsis,
    activeIndicatorClass: "bg-muted",
    activeIconClass: "text-foreground",
  },
];

/** Screens reached from Más (Crecimiento, Salud, Ajustes) keep Más marked. */
const TAB_BY_SEGMENT: Readonly<Record<string, NavItemId>> = {
  feeding: "feeding",
  diapers: "diapers",
  sleep: "sleep",
  more: "more",
  growth: "more",
  health: "more",
  settings: "more",
};

/**
 * The tab of the segment selected below the (tabs) layout, as returned by
 * useSelectedLayoutSegment(): null is the home page.
 */
export function getActiveNavItem(segment: string | null): NavItemId | null {
  if (segment === null) return "today";
  return TAB_BY_SEGMENT[segment] ?? null;
}

// Derived from NAV_ITEMS, so a new tab cannot be forgotten here: "/" is the
// home page (no segment), "/feeding" the "feeding" segment.
const TAB_ROOT_SEGMENTS: ReadonlySet<string | null> = new Set(
  NAV_ITEMS.map(({ href }) => (href === "/" ? null : href.slice(1))),
);

/**
 * Whether the segment is the page a tab links to. On a screen reached from
 * Más (Crecimiento, Salud, Ajustes), Más is the current section but not the
 * current page: aria-current="true" instead of "page".
 */
export function isTabRoot(segment: string | null): boolean {
  return TAB_ROOT_SEGMENTS.has(segment);
}
