import { NextResponse } from "next/server";
import { secretMatches } from "@/lib/outreach/secret";
import { parseStatusPayload } from "@/lib/outreach/status";
import { createSupabaseConnectRepo } from "@/lib/outreach/supabase-connect-repo";

export const runtime = "nodejs";

/** Unipile's account-status webhook. Register it with a custom header `Unipile-Auth` holding UNIPILE_WEBHOOK_SECRET. Unknown accounts are ignored. */
export async function POST(request: Request) {
  if (!secretMatches(request.headers.get("unipile-auth"), process.env.UNIPILE_WEBHOOK_SECRET)) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ ok: true, ignored: "not json" }); }
  const s = parseStatusPayload(body);
  if (!s) return NextResponse.json({ ok: true, ignored: "not a status we track" });
  try {
    await createSupabaseConnectRepo().setStatus(s.accountId, s.status);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "processing failed" }, { status: 500 });
  }
}
