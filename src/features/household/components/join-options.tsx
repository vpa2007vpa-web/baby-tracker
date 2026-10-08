import { ChevronRight, KeyRound, Users, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

const OPTIONS: ReadonlyArray<{
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
}> = [
  {
    href: "/join/create",
    icon: Users,
    title: "Crear una familia",
    description: "Eres el primero en usar la app.",
  },
  {
    href: "/join/code",
    icon: KeyRound,
    title: "Tengo un código",
    description: "Te lo ha enviado el otro progenitor.",
  },
];

/** The two onboarding paths as large links: each one is its own screen. */
export function JoinOptions(): ReactNode {
  return (
    <ul className="flex flex-col gap-3">
      {OPTIONS.map(({ href, icon: Icon, title, description }) => (
        <li key={href}>
          <Link
            href={href}
            className="flex min-h-20 items-center gap-4 rounded-2xl border border-border bg-card p-4 transition-colors outline-none hover:bg-muted focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-muted">
              <Icon aria-hidden className="size-6" />
            </span>
            <span className="flex flex-1 flex-col gap-0.5">
              <span className="text-base font-medium">{title}</span>
              <span className="text-sm text-muted-foreground">
                {description}
              </span>
            </span>
            <ChevronRight
              aria-hidden
              className="size-5 shrink-0 text-muted-foreground"
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}
