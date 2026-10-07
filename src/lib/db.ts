import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";
import { env } from "@/lib/env";

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({
    connectionString: env.DATABASE_URL,
    // Supabase accepts plaintext connections by default; health data must never
    // travel unencrypted. With the CA, Node verifies the chain and hostname.
    ssl: env.DATABASE_CA_CERT
      ? { ca: env.DATABASE_CA_CERT, rejectUnauthorized: true }
      : { rejectUnauthorized: false },
  });
  return new PrismaClient({ adapter });
}

// Hot reload re-evaluates this module; reusing the client avoids opening a new
// pool on every change. The cast only widens globalThis with our cache slot.
const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

export const db: PrismaClient = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") globalForPrisma.prisma = db;
