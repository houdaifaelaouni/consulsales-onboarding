import { describe, expect, it } from "vitest";
import { isStaff, landingFor } from "./access";

describe("admin side access", () => {
  it("lets the founder and delivery staff in, and keeps clients out", () => {
    expect(isStaff({ isAdmin: true, roles: [] })).toBe(true);
    expect(isStaff({ isAdmin: false, roles: ["delivery_lead"] })).toBe(true);
    expect(isStaff({ isAdmin: false, roles: ["client_owner"] })).toBe(false);
    expect(isStaff({ isAdmin: false, roles: [] })).toBe(false);
  });
  it("sends a client who opens /admin back to their own side", () => {
    expect(landingFor("admin", { isAdmin: false, roles: ["client_owner"] })).toBe("/app");
    expect(landingFor("admin", { isAdmin: true, roles: [] })).toBe("ok");
    expect(landingFor("client", { isAdmin: false, roles: [] })).toBe("ok");
  });
});
