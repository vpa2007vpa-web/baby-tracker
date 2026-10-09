import Link from "next/link";
import type { ReactNode } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// notFound() from an edit screen: a record that is missing, malformed or
// another household's looks the same (CLAUDE.md §2.7). With two parents, the
// usual cause is that the other one just deleted it.
export default function TaskNotFound(): ReactNode {
  return (
    <>
      <PageHeader
        backHref="/"
        title="No hemos encontrado ese registro"
        description="Puede que el otro progenitor lo haya borrado."
      />
      <Link
        href="/"
        className={cn(
          buttonVariants({ variant: "outline", size: "lg" }),
          "mt-auto h-14 w-full text-base",
        )}
      >
        Volver a Hoy
      </Link>
    </>
  );
}
