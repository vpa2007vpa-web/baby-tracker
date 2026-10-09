import type { ReactNode } from "react";

import { RefreshOnFocus } from "@/components/layout/refresh-on-focus";

// Wraps every authenticated screen, (tabs) and (task). Static: each page
// checks the session itself (CLAUDE.md §2.2). Phase 4's RealtimeSync lives
// here, replacing RefreshOnFocus.
export default function AppLayout({ children }: LayoutProps<"/">): ReactNode {
  return (
    <>
      {children}
      <RefreshOnFocus />
    </>
  );
}
