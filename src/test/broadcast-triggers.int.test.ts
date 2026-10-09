import { describe, expect, it } from "vitest";

import { db } from "@/lib/db";

// The private Broadcast signal (migration broadcast_household_changes) is
// what tells the other parent's phone to refresh. Prisma does not model
// triggers, so a schema change that recreated a table would drop them
// silently: this test notices.
const RECORD_TABLES = [
  "diaper_changes",
  "feedings",
  "growth_measurements",
  "health_records",
  "sleep_sessions",
];

describe("broadcast triggers", () => {
  it("signal every change of the baby's records", async () => {
    const rows = await db.$queryRaw<{ table_name: string }[]>`
      SELECT c.relname AS table_name
      FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      WHERE NOT t.tgisinternal
        AND t.tgname = 'broadcast_household_change'
        AND t.tgenabled = 'O'
        -- AFTER, FOR EACH ROW, on INSERT, DELETE and UPDATE (pg_trigger bits).
        AND t.tgtype = 1 | 4 | 8 | 16
      ORDER BY c.relname`;

    expect(rows.map(({ table_name }) => table_name)).toEqual(RECORD_TABLES);
  });
});
