"use client";

import { useState, type ReactNode } from "react";

import { CodeStep } from "@/features/auth/components/code-step";
import { EmailStep } from "@/features/auth/components/email-step";

type Step = { name: "email" } | { name: "code"; email: string };

// Both steps live on /login: the email stays in client state instead of the
// URL, so it never ends up in history or server logs.
export function LoginFlow(): ReactNode {
  const [step, setStep] = useState<Step>({ name: "email" });
  const [lastEmail, setLastEmail] = useState("");

  return (
    <>
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold">
          {step.name === "email"
            ? "Entra en Métricas Bebé"
            : "Escribe el código"}
        </h1>
        {step.name === "email" && (
          <p className="text-muted-foreground">
            Te enviamos un código a tu email. Sin contraseñas.
          </p>
        )}
      </header>
      {step.name === "email" ? (
        <EmailStep
          defaultEmail={lastEmail}
          onCodeSent={(email) => {
            setLastEmail(email);
            setStep({ name: "code", email });
          }}
        />
      ) : (
        <CodeStep
          key={step.email}
          email={step.email}
          onChangeEmail={() => setStep({ name: "email" })}
        />
      )}
    </>
  );
}
