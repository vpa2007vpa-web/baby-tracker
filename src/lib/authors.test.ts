import { describe, expect, it } from "vitest";

import { authorLabel } from "@/lib/authors";

const NAMES = { "user-ana": "Ana", "user-luis": "Luis" };

describe("authorLabel", () => {
  it("says ti for the viewer's own records", () => {
    expect(authorLabel("user-ana", "user-ana", NAMES)).toBe("ti");
  });

  it("names the other parent", () => {
    expect(authorLabel("user-luis", "user-ana", NAMES)).toBe("Luis");
  });

  it("names nobody it does not know, such as a former member", () => {
    expect(authorLabel("user-gone", "user-ana", NAMES)).toBeNull();
  });
});
