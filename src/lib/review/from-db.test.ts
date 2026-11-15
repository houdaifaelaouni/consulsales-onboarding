import { describe, expect, it } from "vitest";
import { toDeliverables } from "./from-db";

const row = { id: "d1", kind: "icp", title: "ICP", status: "approved", unlocks: null, approved_by: "u1", approved_at: "2026-11-14T00:00:00Z", approved_version: 2 };
const v = (n: number) => ({ deliverable_id: "d1", n, content: `v${n}`, profile: null, created_by: null, created_at: "2026-11-10T00:00:00Z" });

describe("toDeliverables", () => {
  it("orders versions, names the approver and starts with no threads", () => {
    const [d] = toDeliverables([row], [v(2), v(1)], new Map([["u1", "Sara"]]));
    expect(d.versions.map((x) => x.n)).toEqual([1, 2]);
    expect(d.approved).toEqual({ by: "Sara", at: "2026-11-14T00:00:00Z", versionN: 2 });
    expect(d.threads).toEqual([]);
  });
  it("drops unknown kinds, unknown statuses and deliverables without versions", () => {
    expect(toDeliverables([{ ...row, kind: "x" }, { ...row, id: "d2", status: "??" }, { ...row, id: "d3" }], [v(1)])).toEqual([]);
  });
  it("keeps profile content only when it is an object", () => {
    const [d] = toDeliverables([{ ...row, status: "in_review", approved_at: null }], [{ ...v(1), profile: { name: "A", headline: 5 } }]);
    expect(d.versions[0].profile).toEqual({ name: "A", headline: "", about: "", banner: "" });
    expect(d.approved).toBeUndefined();
  });
});
