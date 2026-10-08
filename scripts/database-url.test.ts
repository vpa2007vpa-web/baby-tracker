import { describe, expect, it } from "vitest";

import { assertDevProject, withDatabase } from "./database-url";

const URL_6543 =
  "postgresql://prisma.abcdefghijklmnopqrst:secret@aws-1-eu-west-3.pooler.supabase.com:6543/postgres?pgbouncer=true";

describe("withDatabase", () => {
  it("swaps only the database name, keeping credentials, port and params", () => {
    expect(withDatabase(URL_6543, "baby_tracker_test")).toBe(
      "postgresql://prisma.abcdefghijklmnopqrst:secret@aws-1-eu-west-3.pooler.supabase.com:6543/baby_tracker_test?pgbouncer=true",
    );
  });
});

describe("assertDevProject", () => {
  it("accepts URLs of the dev project", () => {
    expect(() =>
      assertDevProject(URL_6543, "abcdefghijklmnopqrst"),
    ).not.toThrow();
  });

  it("refuses any other project", () => {
    expect(() => assertDevProject(URL_6543, "zzzzzzzzzzzzzzzzzzzz")).toThrow(
      /not the dev Supabase project/,
    );
  });
});
