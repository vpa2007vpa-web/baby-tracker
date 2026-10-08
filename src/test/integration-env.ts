import { existsSync } from "node:fs";

// Relative import: vitest.config.ts evaluates this file before the `@/` alias
// exists.
import { TEST_DATABASE, withDatabase } from "../../scripts/database-url.ts";

/**
 * Env for the integration project: the app's own DATABASE_URL (transaction
 * pooler, 6543) pointed at baby_tracker_test, so src/lib/db.ts runs unchanged.
 */
export function integrationEnv(): Record<string, string> {
  if (existsSync(".env")) process.loadEnvFile(".env");
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return {};
  return {
    DATABASE_URL: withDatabase(databaseUrl, TEST_DATABASE),
    NODE_ENV: "test",
  };
}
