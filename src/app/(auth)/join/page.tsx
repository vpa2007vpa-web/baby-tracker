import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { getMemberByUserId } from "@/features/auth/queries";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { getSessionUserId } from "@/features/auth/session";

export const metadata: Metadata = { title: "Tu familia · Métricas Bebé" };

// Temporary landing for signed-in users without a household. The create /
// join-with-code screens replace it in phase 3.
export default function JoinPage(): ReactNode {
  return (
    <>
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold">Aún no tienes familia</h1>
        <p className="text-muted-foreground">
          Pronto podrás crear la tuya o unirte con el código que te pase el otro
          progenitor.
        </p>
      </header>
      <Suspense fallback={<Skeleton className="mt-auto h-14 w-full" />}>
        <JoinActions />
      </Suspense>
    </>
  );
}

async function JoinActions(): Promise<ReactNode> {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");
  if (await getMemberByUserId(userId)) redirect("/");

  return (
    <div className="mt-auto">
      <SignOutButton />
    </div>
  );
}
