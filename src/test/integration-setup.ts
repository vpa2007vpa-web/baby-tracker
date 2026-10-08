import { afterAll, beforeEach } from "vitest";

import { db } from "@/lib/db";

// Relative import: scripts/ lives outside the `@/` alias root.
import { assertTestDatabase } from "../../scripts/database-url";

beforeEach(async () => {
  const [row] = await db.$queryRaw<
    { name: string }[]
  >`SELECT current_database() AS name`;
  // Last line of defense: never wipe anything but the test database.
  assertTestDatabase(row?.name);
  // Cascades to members, invites, babies and every baby record.
  await db.$executeRaw`TRUNCATE public.households CASCADE`;
});

afterAll(async () => {
  await db.$disconnect();
});
