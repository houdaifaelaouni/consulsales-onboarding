import { describe, expect, it } from "vitest";
import { activeHref, APP_NAV, DEMO_NAV, isActive } from "./nav";

describe("isActive", () => {
  it("matches a page and the pages beneath it", () => {
    expect(isActive("/demo/review", "/demo/review")).toBe(true);
    expect(isActive("/demo/review/icp", "/demo/review")).toBe(true);
  });
  it("does not match a sibling that only shares a prefix", () => {
    expect(isActive("/demo/reviews", "/demo/review")).toBe(false);
    expect(isActive("/demo/admin", "/demo/access")).toBe(false);
  });
  it("keeps index routes exact so Home is not lit on every page", () => {
    expect(isActive("/app", "/app")).toBe(true);
    expect(isActive("/app/tasks/book_kickoff", "/app")).toBe(false);
  });
  it("ignores trailing slashes", () => {
    expect(isActive("/demo/payments/", "/demo/payments")).toBe(true);
  });
});

describe("activeHref", () => {
  it("lights exactly one item, and the overview only on its own page", () => {
    expect(activeHref("/demo", DEMO_NAV)).toBe("/demo");
    expect(activeHref("/demo/review/icp", DEMO_NAV)).toBe("/demo/review");
    expect(activeHref("/demo/admin/mono-agency", DEMO_NAV)).toBe("/demo/admin");
    expect(activeHref("/somewhere/else", DEMO_NAV)).toBeUndefined();
  });
});

describe("nav config", () => {
  it("has unique links, all under the right area", () => {
    expect(new Set(DEMO_NAV.map((n) => n.href)).size).toBe(DEMO_NAV.length);
    expect(DEMO_NAV.every((n) => n.href === "/demo" || n.href.startsWith("/demo/"))).toBe(true);
    expect(APP_NAV.every((n) => n.href.startsWith("/app"))).toBe(true);
  });
});
