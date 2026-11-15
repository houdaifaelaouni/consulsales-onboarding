import { describe, expect, it } from "vitest";
import { render } from "@react-email/components";
import { INVITE_COPY } from "./copy";
import { sendInviteEmail, type EmailClient } from "./send";
import { InviteEmail } from "./templates/invite";

function fakeClient(result: Awaited<ReturnType<EmailClient["emails"]["send"]>>) {
  const calls: Array<{ payload: Parameters<EmailClient["emails"]["send"]>[0]; options?: { idempotencyKey?: string } }> = [];
  const client: EmailClient = { emails: { async send(payload, options) { calls.push({ payload, options }); return result; } } };
  return { client, calls };
}

describe("invite email", () => {
  it("sends in the client's language with an idempotency key and the magic link", async () => {
    const { client, calls } = fakeClient({ data: { id: "em_1" }, error: null });
    const id = await sendInviteEmail({ to: "sara@agency.com", locale: "fr", url: "https://app/x", idempotencyKey: "invite-whop-pay_1" }, { client, from: "Test <t@example.com>" });
    expect(id).toBe("em_1");
    expect(calls[0].payload).toMatchObject({ to: "sara@agency.com", subject: INVITE_COPY.fr.subject, from: "Test <t@example.com>" });
    expect(calls[0].options).toEqual({ idempotencyKey: "invite-whop-pay_1" });
  });

  it("throws when Resend returns an error so the webhook is retried", async () => {
    const { client } = fakeClient({ data: null, error: { message: "domain not verified" } });
    await expect(sendInviteEmail({ to: "a@b.com", locale: "en", url: "u", idempotencyKey: "k" }, { client })).rejects.toThrow(/domain not verified/);
  });

  it("renders one button linking to the magic link, in every language", async () => {
    for (const [lang, copy] of Object.entries(INVITE_COPY)) {
      const html = await render(InviteEmail({ copy, url: "https://app/magic?t=1", lang }));
      expect(html).toContain('href="https://app/magic?t=1"');
      expect(html).toContain(copy.button);
      expect((html.match(/<a /g) ?? []).length).toBe(1);
    }
  });

  it("has copy for all six languages", () => {
    expect(Object.keys(INVITE_COPY).sort()).toEqual(["de", "en", "es", "fr", "pt-br", "zh"]);
  });
});
