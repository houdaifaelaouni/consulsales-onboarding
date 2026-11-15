// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const generateLink = vi.fn();
const verifyOtp = vi.fn();
const rpc = vi.fn();
const getUserById = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ rpc, auth: { admin: { getUserById, generateLink } } }),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { verifyOtp } }) }));

import { POST } from "./route";

const call = (body: unknown) => POST(new Request("http://x/api/auth/pin-login", { method: "POST", body: JSON.stringify(body) }));

beforeEach(() => {
  for (const m of [generateLink, verifyOtp, rpc, getUserById]) m.mockReset();
  rpc.mockResolvedValue({ data: "user-1", error: null });
  getUserById.mockResolvedValue({ data: { user: { email: "real@studio.com", email_confirmed_at: "2026-11-01" } }, error: null });
  generateLink.mockResolvedValue({ data: { properties: { hashed_token: "hash" } }, error: null });
  verifyOtp.mockResolvedValue({ error: null });
});

describe("POST /api/auth/pin-login", () => {
  it("signs in with the account's own email, never the one in the request", async () => {
    const res = await call({ email: "victim@studio.com", pin: "482915" });
    expect(res.status).toBe(200);
    expect(generateLink).toHaveBeenCalledWith({ type: "magiclink", email: "real@studio.com" });
  });

  it("answers every failure the same way: 401 and no detail", async () => {
    const bodies: string[] = [];
    const cases: Array<() => Promise<Response>> = [
      () => call({ email: "nope", pin: "482915" }),
      () => call({ email: "a@b.co", pin: "12" }),
      async () => { rpc.mockResolvedValueOnce({ data: null, error: null }); return call({ email: "a@b.co", pin: "482915" }); },
      async () => { getUserById.mockResolvedValueOnce({ data: { user: { email: "x@y.z", email_confirmed_at: null } }, error: null }); return call({ email: "a@b.co", pin: "482915" }); },
      async () => { verifyOtp.mockResolvedValueOnce({ error: new Error("bad") }); return call({ email: "a@b.co", pin: "482915" }); },
    ];
    for (const c of cases) { const r = await c(); expect(r.status).toBe(401); bodies.push(await r.text()); }
    expect(new Set(bodies).size).toBe(1);
  });

  it("never signs in when the account's email is not confirmed", async () => {
    getUserById.mockResolvedValue({ data: { user: { email: "real@studio.com", email_confirmed_at: null } }, error: null });
    const res = await call({ email: "real@studio.com", pin: "482915" });
    expect(res.status).toBe(401);
    expect(generateLink).not.toHaveBeenCalled();
  });
});
