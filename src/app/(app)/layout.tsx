import { Suspense, type ReactNode } from "react";

import { RealtimeSyncLoader } from "@/features/sync/components/realtime-sync-loader";

// Wraps every authenticated screen, (tabs) and (task). The layout stays
// static (decision 054): the session is read inside Suspense, by the sync
// loader and by each page itself (CLAUDE.md §2.2).
export default function AppLayout({ children }: LayoutProps<"/">): ReactNode {
  return (
    <>
      {children}
      <Suspense fallback={null}>
        <RealtimeSyncLoader />
      </Suspense>
    </>
  );
}
