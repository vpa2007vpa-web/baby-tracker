import "server-only";

import { z } from "zod";

import { publicEnv } from "@/lib/public-env";

function isValidTimeZone(timeZone: string): boolean {
  return Intl.supportedValuesOf("timeZone").includes(timeZone);
}

const serverEnvSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    // App runtime only: Supavisor transaction pooler. DIRECT_URL is deliberately
    // absent: it belongs to the Prisma CLI (prisma.config.ts), never to the app.
    DATABASE_URL: z
      .url({ protocol: /^postgres(ql)?$/ })
      .refine((url) => new URL(url).port === "6543", {
        error: "DATABASE_URL must use the transaction pooler (port 6543)",
      }),
    // Supabase root CA (PEM) from Database settings → SSL configuration.
    // Enables full certificate verification of the database connection.
    DATABASE_CA_CERT: z.string().includes("BEGIN CERTIFICATE").optional(),
    APP_TIMEZONE: z.string().default("Europe/Madrid").refine(isValidTimeZone, {
      error: "APP_TIMEZONE must be an IANA time zone, e.g. Europe/Madrid",
    }),
    // Set by Vercel. NODE_ENV cannot tell a real deployment apart, because
    // `next build` runs with NODE_ENV=production on every machine.
    VERCEL_ENV: z.enum(["development", "preview", "production"]).optional(),
  })
  .refine((vars) => vars.VERCEL_ENV !== "production" || vars.DATABASE_CA_CERT, {
    error: "DATABASE_CA_CERT is required in the production deployment",
    path: ["DATABASE_CA_CERT"],
  });

export type Env = z.infer<typeof serverEnvSchema> & typeof publicEnv;

export const env: Env = {
  ...serverEnvSchema.parse(process.env),
  ...publicEnv,
};
