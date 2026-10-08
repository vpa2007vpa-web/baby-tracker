import { describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { createFamily } from "@/test/factories";

describe("integration test isolation", () => {
  it("runs against baby_tracker_test", async () => {
    const [row] = await db.$queryRaw<
      { name: string }[]
    >`SELECT current_database() AS name`;
    expect(row?.name).toBe("baby_tracker_test");
  });

  it.each([1, 2])(
    "starts every test with an empty database (run %i)",
    async () => {
      expect(await db.household.count()).toBe(0);
      await createFamily();
      expect(await db.household.count()).toBe(1);
    },
  );
});
