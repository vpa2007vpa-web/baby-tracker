import { describe, expect, it } from "vitest";

import { authorLabel, describeAuthorship } from "@/lib/authors";

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

describe("describeAuthorship", () => {
  it("says who logged a record and who edited it last", () => {
    expect(describeAuthorship("Ana", null)).toBe("Registrado por Ana");
    expect(describeAuthorship("ti", "Luis")).toBe(
      "Registrado por ti · editado por Luis",
    );
  });

  it("starts with a capital when only the editor is known", () => {
    expect(describeAuthorship(null, "Luis")).toBe("Editado por Luis");
  });

  it("says nothing when nobody is known", () => {
    expect(describeAuthorship(null, null)).toBeUndefined();
  });
});
