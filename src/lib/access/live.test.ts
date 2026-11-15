import { describe, expect, it } from "vitest";
import { ACCESS_ITEMS, LIVE_ACCESS_ITEMS } from "./items";
import { rowsToStates } from "./rows";

describe("live access checklist", () => {
  it("uses the same item ids as the demo so saved rows and task sync keep working", () => {
    expect(LIVE_ACCESS_ITEMS.map((i) => i.id)).toEqual(ACCESS_ITEMS.map((i) => i.id));
  });
  it("never asks for a secret, an OAuth sign-in or a file upload it cannot honour", () => {
    expect(LIVE_ACCESS_ITEMS.some((i) => ["vault", "oauth", "files"].includes(i.kind))).toBe(false);
  });
  it("link items carry their own label and example", () => {
    for (const i of LIVE_ACCESS_ITEMS.filter((x) => x.kind === "link")) {
      expect(i.linkLabel).toBeTruthy();
      expect(i.linkPlaceholder).toMatch(/^https:\/\//);
    }
  });
  it("a reported-but-unconfirmed item loads back as still to do", () => {
    const s = rowsToStates([{ item_id: "linkedin", status: "pending", blocked_since: null, detail: "reported" }]);
    expect(s.linkedin).toEqual({ status: "pending", detail: "reported" });
  });
});
