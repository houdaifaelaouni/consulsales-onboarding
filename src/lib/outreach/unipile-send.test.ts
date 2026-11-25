import { describe, expect, it } from "vitest";
import { resolveProviderId, sendInvite, sendMessage } from "./unipile-send";

const cfg = { dsn: "api1.unipile.com:13111", apiKey: "key" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("resolveProviderId", () => {
  it("asks for the public address with the account id", async () => {
    let called: { url: string; headers: unknown } | null = null;
    const fetchImpl = (async (url: URL, init: RequestInit) => {
      called = { url: url.toString(), headers: init.headers };
      return json({ provider_id: "ACoAAA1" });
    }) as typeof fetch;
    await expect(resolveProviderId({ ...cfg, fetchImpl }, { accountId: "acc1", linkedinKey: "ana-costa" })).resolves.toBe("ACoAAA1");
    expect(called!.url).toBe("https://api1.unipile.com:13111/api/v1/users/ana-costa?account_id=acc1");
    expect(called!.headers).toMatchObject({ "X-API-KEY": "key" });
  });
  it("returns null when the profile has no Provider id, and throws on an error status", async () => {
    await expect(resolveProviderId({ ...cfg, fetchImpl: (async () => json({})) as typeof fetch }, { accountId: "a", linkedinKey: "x" })).resolves.toBeNull();
    await expect(resolveProviderId({ ...cfg, fetchImpl: (async () => json({}, 400)) as typeof fetch }, { accountId: "a", linkedinKey: "x" })).rejects.toThrow("profile lookup failed (400)");
  });
});

describe("sendInvite", () => {
  it("posts the account, the person and a note capped at 300 characters", async () => {
    let body: Record<string, unknown> = {};
    const fetchImpl = (async (_url: string, init: RequestInit) => {
      body = JSON.parse(String(init.body));
      return json({});
    }) as typeof fetch;
    await sendInvite({ ...cfg, fetchImpl }, { accountId: "acc1", providerId: "ACo1", note: `  ${"a".repeat(400)}  ` });
    expect(body.account_id).toBe("acc1");
    expect(body.provider_id).toBe("ACo1");
    expect(String(body.message)).toHaveLength(300);
  });
  it("leaves the note out when there is none, because LinkedIn refuses an empty message", async () => {
    let body: Record<string, unknown> = {};
    const fetchImpl = (async (_url: string, init: RequestInit) => {
      body = JSON.parse(String(init.body));
      return json({});
    }) as typeof fetch;
    await sendInvite({ ...cfg, fetchImpl }, { accountId: "acc1", providerId: "ACo1", note: "   " });
    expect(body).toEqual({ account_id: "acc1", provider_id: "ACo1" });
  });
  it("throws with the status when Unipile refuses", async () => {
    await expect(sendInvite({ ...cfg, fetchImpl: (async () => json({}, 422)) as typeof fetch }, { accountId: "a", providerId: "p", note: "hi" }))
      .rejects.toThrow("invite failed (422)");
  });
});

describe("sendMessage", () => {
  it("starts the one-to-one chat with a form body and returns its id", async () => {
    let form: FormData | null = null;
    const fetchImpl = (async (_url: string, init: RequestInit) => {
      form = init.body as FormData;
      return json({ chat_id: "chat1" });
    }) as typeof fetch;
    const out = await sendMessage({ ...cfg, fetchImpl }, { accountId: "acc1", providerId: "ACo1", text: "Hello" });
    expect(out).toEqual({ chatId: "chat1" });
    expect(form!.get("account_id")).toBe("acc1");
    expect(form!.get("attendees_ids")).toBe("ACo1");
    expect(form!.get("text")).toBe("Hello");
  });
  it("returns no chat id when Unipile sends none", async () => {
    const fetchImpl = (async () => json({})) as typeof fetch;
    await expect(sendMessage({ ...cfg, fetchImpl }, { accountId: "a", providerId: "p", text: "t" })).resolves.toEqual({ chatId: null });
  });
});
