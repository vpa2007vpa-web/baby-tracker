"use client";

import { LogOut } from "lucide-react";
import { useTransition, type ReactNode } from "react";

import { signOut } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";

export function SignOutButton(): ReactNode {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      disabled={isPending}
      onClick={() => startTransition(() => signOut())}
      className="h-14 w-full text-base"
    >
      <LogOut aria-hidden className="size-5" />
      {isPending ? "Cerrando sesión…" : "Cerrar sesión"}
    </Button>
  );
}
