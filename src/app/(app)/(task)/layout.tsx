import type { ReactNode } from "react";

// One task per screen (CLAUDE.md §4.3): forms, edits and the invite. No
// bottom bar, so the primary button sits at the very bottom (FormFooter
// cancels this bottom padding and carries the safe area itself). Every page
// shows a clear Atrás and checks the session itself (CLAUDE.md §2.2).
export default function TaskLayout({ children }: LayoutProps<"/">): ReactNode {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-4 pt-[calc(env(safe-area-inset-top)_+_2rem)] pb-[max(1rem,env(safe-area-inset-bottom))]">
      {children}
    </main>
  );
}
