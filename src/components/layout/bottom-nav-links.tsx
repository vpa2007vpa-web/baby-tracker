"use client";

import { useSelectedLayoutSegment } from "next/navigation";
import type { ReactNode } from "react";

import { BottomNavList } from "@/components/layout/bottom-nav-list";
import { getActiveNavItem } from "@/components/layout/nav-items";

/** The only client piece of the bar: it reads which tab is active. */
export function BottomNavLinks(): ReactNode {
  const segment = useSelectedLayoutSegment();
  return <BottomNavList activeId={getActiveNavItem(segment)} />;
}
