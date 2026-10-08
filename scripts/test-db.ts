/**
 * Creates (if missing) and migrates the integration test database inside the
 * DEV Supabase project:
 *
 *   npm run test:db
 *
 * Safe to re-run: CREATE DATABASE only when absent; stubs and migrations are
 * idempotent. Refuses to run unless DIRECT_URL belongs to SEED_DEV_PROJECT_REF.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { Client } from "pg";

import { assertDevProject, TEST_DATABASE, withDatabase } from "./database-url";

process.loadEnvFile(".env");

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name} in .env`);
  return value;
}

const directUrl = requireEnv("DIRECT_URL");
const devProjectRef = requireEnv("SEED_DEV_PROJECT_REF");
const caCert = process.env.DATABASE_CA_CERT;
const ssl = caCert
  ? { ca: caCert, rejectUnauthorized: true }
  : { rejectUnauthorized: false };

async function withClient(
  url: string,
  run: (client: Client) => Promise<void>,
): Promise<void> {
  const client = new Client({ connectionString: url, ssl });
  await client.connect();
  try {
    await run(client);
  } finally {
    await client.end();
  }
}

async function main(): Promise<void> {
  assertDevProject(directUrl, devProjectRef);
  const testUrl = withDatabase(directUrl, TEST_DATABASE);

  await withClient(directUrl, async (client) => {
    const { rowCount } = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [TEST_DATABASE],
    );
    // The name is a constant, never user input, so interpolation is safe.
    if (rowCount === 0) await client.query(`CREATE DATABASE ${TEST_DATABASE}`);
  });

  await withClient(testUrl, async (client) => {
    await client.query(
      readFileSync("prisma/platform/shadow-stubs.sql", "utf8"),
    );
  });

  // Run the Prisma CLI through Node itself: no shell, so arguments are never
  // re-parsed (spawning npx.cmd on Windows would require one).
  // prisma.config.ts loads .env without overriding, so this DIRECT_URL wins.
  execFileSync(
    process.execPath,
    [join("node_modules", "prisma", "build", "index.js"), "migrate", "deploy"],
    { env: { ...process.env, DIRECT_URL: testUrl }, stdio: "inherit" },
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
