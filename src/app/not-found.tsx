import { SearchX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Página no encontrada · Métricas Bebé",
};

// A URL that matches no route (a mistyped or stale link). Inside the root
// layout but outside the (app) groups, so it brings its own column.
export default function NotFound(): ReactNode {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-4 pt-[calc(env(safe-area-inset-top)_+_2rem)] pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="flex flex-col gap-2">
        <SearchX aria-hidden className="size-8 text-muted-foreground" />
        <h1 className="text-3xl font-semibold text-balance">
          Esta página no existe
        </h1>
        <p className="text-muted-foreground">
          Puede que el enlace esté mal o sea antiguo.
        </p>
      </div>
      <Link
        href="/"
        className={cn(
          buttonVariants({ size: "lg" }),
          "mt-auto h-14 w-full text-base",
        )}
      >
        Volver a Hoy
      </Link>
    </main>
  );
}
