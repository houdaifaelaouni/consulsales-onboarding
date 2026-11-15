import { Resend } from "resend";
import type { Locale } from "@/lib/i18n";
import { INVITE_COPY } from "./copy";
import { InviteEmail } from "./templates/invite";

/** Minimal slice of the Resend client we use, so tests can pass a fake. */
export interface EmailClient {
  emails: {
    send(
      payload: { from: string; to: string; subject: string; react: React.ReactElement },
      options?: { idempotencyKey?: string },
    ): Promise<{ data: { id: string } | null; error: { message: string; name?: string } | null }>;
  };
}

export interface EmailConfig { client?: EmailClient; from?: string }

function getClient(cfg: EmailConfig): EmailClient {
  if (cfg.client) return cfg.client;
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("Email is not configured (RESEND_API_KEY)");
  return new Resend(key) as unknown as EmailClient;
}

/** Sender. Until the domain is verified in Resend, use onboarding@resend.dev (only delivers to your own address). */
export function getFrom(cfg: EmailConfig = {}): string {
  return cfg.from ?? process.env.EMAIL_FROM ?? "ConsulSales <onboarding@resend.dev>";
}

export async function sendInviteEmail(
  p: { to: string; locale: Locale; url: string; idempotencyKey: string },
  cfg: EmailConfig = {},
): Promise<string> {
  const copy = INVITE_COPY[p.locale] ?? INVITE_COPY.en;
  const { data, error } = await getClient(cfg).emails.send(
    { from: getFrom(cfg), to: p.to, subject: copy.subject, react: InviteEmail({ copy, url: p.url, lang: p.locale }) },
    { idempotencyKey: p.idempotencyKey },
  );
  // The SDK returns { data, error } instead of throwing: surface failures so the webhook retries.
  if (error || !data) throw new Error(`Invite email failed: ${error?.message ?? "no response"}`);
  return data.id;
}
