import { describe, expect, it } from "vitest";

import {
  getActiveNavItem,
  isTabRoot,
  NAV_ITEMS,
} from "@/components/layout/nav-items";

describe("NAV_ITEMS", () => {
  it("lists the five destinations of the bottom bar, in order", () => {
    expect(NAV_ITEMS.map(({ label, href }) => [label, href])).toEqual([
      ["Hoy", "/"],
      ["Tomas", "/feeding"],
      ["Pañales", "/diapers"],
      ["Sueño", "/sleep"],
      ["Más", "/more"],
    ]);
  });
});

describe("getActiveNavItem", () => {
  it("marks Hoy on the home page, where no segment is selected", () => {
    expect(getActiveNavItem(null)).toBe("today");
  });

  it.each([
    ["feeding", "feeding"],
    ["diapers", "diapers"],
    ["sleep", "sleep"],
    ["more", "more"],
  ])("marks the tab of the %s segment", (segment, item) => {
    expect(getActiveNavItem(segment)).toBe(item);
  });

  it.each(["growth", "health", "settings"])(
    "keeps Más marked on %s, a screen reached from Más",
    (segment) => {
      expect(getActiveNavItem(segment)).toBe("more");
    },
  );

  it("marks nothing on an unknown segment", () => {
    expect(getActiveNavItem("unknown")).toBeNull();
  });
});

describe("isTabRoot", () => {
  it.each([null, "feeding", "diapers", "sleep", "more"])(
    "treats %s as the page of its own tab",
    (segment) => {
      expect(isTabRoot(segment)).toBe(true);
    },
  );

  it.each(["growth", "health", "settings"])(
    "treats %s as a page inside Más, not Más itself",
    (segment) => {
      expect(isTabRoot(segment)).toBe(false);
    },
  );
});
