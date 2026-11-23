import { describe, expect, it } from "vitest";
import { completeConnect, hashToken, NOTICE_VERSION, startConnect, type ConnectRepo } from "./connect";
import { mapStatus, parseNotify, parseStatusPayload } from "./status";
import { createHostedLink, unipileBase } from "./unipile";

function fakeRepo(over: Partial<ConnectRepo> = {}) {
  const attempts = new Map<string, { workspaceId: string; expiresAt: Date; used: boolean }>();
  const accounts: Array<{ workspaceId: string; unipileAccountId: string }> = [];
  const repo: ConnectRepo = {
    hasConsent: async () => true,
    saveAttempt: async (a) => { attempts.set(a.tokenHash, { workspaceId: a.workspaceId, expiresAt: a.expiresAt, used: false }); },
    takeAttempt: async (h, now) => {
      const a = attempts.get(h);
      if (!a || a.used || a.expiresAt <= now) return null;
      a.used = true;
      return { workspaceId: a.workspaceId };
    },
    upsertAccount: async (a) => { accounts.push(a); },
    setStatus: async () => {},
    ...over,
  };
  return { repo, attempts, accounts };
}
const link = async (i: { name: string }) => ({ url: `https://hosted.example/${i.name}` });

describe("startConnect", () => {
  it("refuses without accepted consent and creates nothing", async () => {
    const { repo, attempts } = fakeRepo({ hasConsent: async () => false });
    expect(await startConnect(repo, link, { workspaceId: "w1", userId: "u1" })).toEqual({ ok: false, reason: "consent_required" });
    expect(attempts.size).toBe(0);
  });
  it("saves only a hash of the token, and gives the token to Unipile as the name", async () => {
    const { repo, attempts } = fakeRepo();
    const r = await startConnect(repo, link, { workspaceId: "w1", userId: "u1" });
    expect(r.ok).toBe(true);
    const token = r.ok ? r.url.split("/").pop()! : "";
    expect(token.length).toBeGreaterThan(20);
    expect([...attempts.keys()]).toEqual([hashToken(token)]);
    expect(attempts.has(token)).toBe(false);
  });
  it("reports failure when Unipile fails", async () => {
    const { repo } = fakeRepo();
    expect(await startConnect(repo, async () => { throw new Error("down"); }, { workspaceId: "w1", userId: "u1" })).toEqual({ ok: false, reason: "failed" });
  });
});

describe("completeConnect", () => {
  async function started() {
    const f = fakeRepo();
    const r = await startConnect(f.repo, link, { workspaceId: "w1", userId: "u1", now: new Date("2026-11-24T10:00:00Z") });
    return { ...f, token: r.ok ? r.url.split("/").pop()! : "" };
  }
  it("links the account to the workspace that clicked connect", async () => {
    const { repo, accounts, token } = await started();
    expect(await completeConnect(repo, { accountId: "acc1", token }, new Date("2026-11-24T10:05:00Z"))).toBe("connected");
    expect(accounts).toEqual([{ workspaceId: "w1", unipileAccountId: "acc1" }]);
  });
  it("works once only", async () => {
    const { repo, accounts, token } = await started();
    await completeConnect(repo, { accountId: "acc1", token }, new Date("2026-11-24T10:05:00Z"));
    expect(await completeConnect(repo, { accountId: "acc2", token }, new Date("2026-11-24T10:06:00Z"))).toBe("ignored");
    expect(accounts).toHaveLength(1);
  });
  it("ignores an expired or unknown token", async () => {
    const { repo, accounts, token } = await started();
    expect(await completeConnect(repo, { accountId: "acc1", token }, new Date("2026-11-24T12:00:00Z"))).toBe("ignored");
    expect(await completeConnect(repo, { accountId: "acc1", token: "guess" })).toBe("ignored");
    expect(accounts).toEqual([]);
  });
  it("uses the current notice version", () => expect(NOTICE_VERSION).toMatch(/^\d{4}-\d{2}$/));
});

describe("status parsing", () => {
  it("maps Unipile words to ours and ignores the rest", () => {
    expect(["OK", "CREATION_SUCCESS", "RECONNECTED", "CONNECTING", "CREDENTIALS", "ERROR", "STOPPED", "DELETED", "SYNC_SUCCESS", 7].map(mapStatus))
      .toEqual(["ok", "ok", "ok", "connecting", "credentials", "error", "error", "deleted", null, null]);
  });
  it("reads the account status webhook", () => {
    expect(parseStatusPayload({ AccountStatus: { account_id: "a1", account_type: "LINKEDIN", message: "CREDENTIALS" } })).toEqual({ accountId: "a1", status: "credentials" });
    expect(parseStatusPayload({ AccountStatus: { account_id: "a1", message: "SYNC_SUCCESS" } })).toBeNull();
    expect(parseStatusPayload({})).toBeNull();
    expect(parseStatusPayload(null)).toBeNull();
  });
  it("reads the hosted-login notification", () => {
    expect(parseNotify({ status: "CREATION_SUCCESS", account_id: "a1", name: "tok" })).toEqual({ accountId: "a1", token: "tok" });
    expect(parseNotify({ status: "FAILED", account_id: "a1", name: "tok" })).toBeNull();
    expect(parseNotify({ status: "CREATION_SUCCESS", account_id: "a1" })).toBeNull();
  });
});

describe("unipile client", () => {
  it("normalises the DSN", () => {
    expect(unipileBase("api1.unipile.com:13111")).toBe("https://api1.unipile.com:13111");
    expect(unipileBase(" https://api1.unipile.com:13111/ ")).toBe("https://api1.unipile.com:13111");
    expect(unipileBase("not a host!")).toBeNull();
    expect(unipileBase(undefined)).toBeNull();
  });
  it("asks for a LinkedIn-only hosted link with our redirect and notify urls", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const fetchImpl = (async (url: string, init: RequestInit) => { calls.push({ url, init }); return { ok: true, json: async () => ({ object: "HostedAuthURL", url: "https://account.unipile.com/x" }) }; }) as unknown as typeof fetch;
    const r = await createHostedLink({ dsn: "api1.unipile.com:13111", apiKey: "k", fetchImpl }, { name: "tok", expiresOn: new Date("2026-11-24T11:00:00Z"), successUrl: "https://app/ok", failureUrl: "https://app/no", notifyUrl: "https://app/n" });
    expect(r).toEqual({ url: "https://account.unipile.com/x" });
    expect(calls[0].url).toBe("https://api1.unipile.com:13111/api/v1/hosted/accounts/link");
    expect((calls[0].init.headers as Record<string, string>)["X-API-KEY"]).toBe("k");
    expect(JSON.parse(String(calls[0].init.body))).toMatchObject({ type: "create", providers: ["LINKEDIN"], name: "tok", expiresOn: "2026-11-24T11:00:00.000Z", notify_url: "https://app/n" });
  });
  it("throws when not configured or when Unipile refuses", async () => {
    await expect(createHostedLink({ dsn: "", apiKey: "" }, { name: "t", expiresOn: new Date(), successUrl: "a", failureUrl: "b", notifyUrl: "c" })).rejects.toThrow();
    const fetchImpl = (async () => ({ ok: false, status: 401 })) as unknown as typeof fetch;
    await expect(createHostedLink({ dsn: "api1.unipile.com:13111", apiKey: "k", fetchImpl }, { name: "t", expiresOn: new Date(), successUrl: "a", failureUrl: "b", notifyUrl: "c" })).rejects.toThrow();
  });
});
