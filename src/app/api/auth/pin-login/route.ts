import { NextResponse } from "next/server";
import { isPinFormat } from "@/lib/auth/pin";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// One answer for every failure (wrong PIN, unknown email, no PIN set, locked), so nothing reveals which accounts exist.
const FAIL = () => NextResponse.json({ ok: false }, { status: 401 });

/** Signs in with email + 6-digit PIN. The database counts failures and locks the PIN for 15 minutes after 5. */
export async function POST(request: Request) {
  let body: { email?: unknown; pin?: unknown };
  try { body = await request.json(); } catch { return FAIL(); }
  const email = typeof body.email === "string" ? body.email.trim().slice(0, 254) : "";
  const pin = typeof body.pin === "string" ? body.pin : "";
  if (!email.includes("@") || !isPinFormat(pin)) return FAIL();

  try {
    const admin = createAdminClient();
    const { data: userId, error } = await admin.rpc("pin_verify", { p_email: email, p_pin: pin });
    if (error || !userId) return FAIL();

    // Sign in the account the PIN belongs to, using that account's own email, never the one typed in the request.
    const { data: account, error: accountErr } = await admin.auth.admin.getUserById(userId as string);
    const accountEmail = account?.user?.email;
    if (accountErr || !accountEmail || !account?.user?.email_confirmed_at) return FAIL();

    // Start a normal session without sending an email: make a one-time link on the server and redeem it at once.
    const { data: link, error: linkErr } = await admin.auth.admin.generateLink({ type: "magiclink", email: accountEmail });
    const hash = link?.properties?.hashed_token;
    if (linkErr || !hash) return FAIL();
    const supabase = await createClient();
    const { error: verifyErr } = await supabase.auth.verifyOtp({ type: "magiclink", token_hash: hash });
    if (verifyErr) return FAIL();
    return NextResponse.json({ ok: true });
  } catch {
    // Never log the email or PIN. A missing service key lands here too.
    return FAIL();
  }
}
