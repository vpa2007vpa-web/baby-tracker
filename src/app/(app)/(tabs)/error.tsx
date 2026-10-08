"use client";

import type { ReactNode } from "react";

import { ErrorState } from "@/components/shared/error-state";

// Rendered inside the (tabs) layout: the bottom bar remains a way out.
export default function TabsError({ retry }: { retry: () => void }): ReactNode {
  return <ErrorState retry={retry} />;
}
