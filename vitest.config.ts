import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

import { integrationEnv } from "./src/test/integration-env.ts";

const fromRoot = (path: string): string =>
  fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": fromRoot("./src"),
      "server-only": fromRoot("./src/test/server-only.ts"),
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: ["src/**/*.test.ts", "scripts/**/*.test.ts"],
          exclude: ["src/**/*.int.test.ts"],
          // Unit tests must never reach a database: if one imports `db` by
          // mistake it fails fast instead of reading or writing dev data.
          env: {
            DATABASE_URL:
              "postgresql://unit-tests-have-no-database@127.0.0.1:6543/none",
          },
        },
      },
      {
        extends: true,
        test: {
          // Real PostgreSQL: baby_tracker_test in the dev project (npm run test:db).
          name: "integration",
          environment: "node",
          include: ["src/**/*.int.test.ts"],
          setupFiles: ["src/test/integration-setup.ts"],
          // One shared database: files must not truncate under each other.
          fileParallelism: false,
          env: integrationEnv(),
          testTimeout: 20_000,
          hookTimeout: 20_000,
        },
      },
    ],
  },
});
