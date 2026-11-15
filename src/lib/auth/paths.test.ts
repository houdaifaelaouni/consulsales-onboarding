import { describe, expect, it } from "vitest";
import { isProtectedPath } from "./paths";

describe("isProtectedPath", () => {
  it("protects both sides and everything beneath them", () => {
    for (const p of ["/app", "/app/intake", "/admin", "/admin/integrations", "/admin/clients/arc-media"]) expect(isProtectedPath(p)).toBe(true);
  });
  it("leaves public pages open, including look-alikes", () => {
    for (const p of ["/", "/login", "/health", "/demo/admin", "/welcome", "/application", "/administrator", "/api/webhooks/whop"]) expect(isProtectedPath(p)).toBe(false);
  });
});
