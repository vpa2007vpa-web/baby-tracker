import type { Metadata } from "next";
import type { ReactNode } from "react";

import { LoginFlow } from "@/features/auth/components/login-flow";

export const metadata: Metadata = { title: "Entrar · Métricas Bebé" };

// Signed-in visitors never reach this page: src/proxy.ts redirects them to "/".
export default function LoginPage(): ReactNode {
  return <LoginFlow />;
}
