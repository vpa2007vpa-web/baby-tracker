import type { ReactNode } from "react";

export default function AuthLayout({ children }: LayoutProps<"/">): ReactNode {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-4 pt-12 pb-[max(1rem,env(safe-area-inset-bottom))]">
      {children}
    </main>
  );
}
