import { NextResponse } from "next/server";
import { completeConnect } from "@/lib/outreach/connect";
import { secretMatches } from "@/lib/outreach/secret";
import { parseNotify } from "@/lib/outreach/status";
import { createSupabaseConnectRepo } from "@/lib/outreach/supabase-connect-repo";

export const runtime = "nodejs";

/** Unipile calls this after a client signs in on the hosted page. Unipile does not sign it, so the URL carries our secret and the body carries a single-use token. */
export async function POST(request: Request) {
  if (!secretMatches(new URL(request.url).searchParams.get("s"), process.env.UNIPILE_WEBHOOK_SECRET)) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ ok: true, ignored: "not json" }); }
  const n = parseNotify(body);
  if (!n) return NextResponse.json({ ok: true, ignored: "not a connection" });
  try {
    return NextResponse.json({ ok: true, result: await completeConnect(createSupabaseConnectRepo(), n) });
  } catch {
    return NextResponse.json({ error: "processing failed" }, { status: 500 });
  }
}
