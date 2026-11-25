import { NextResponse } from "next/server";
import { parseIncoming } from "@/lib/outreach/replies";
import { secretMatches } from "@/lib/outreach/secret";
import { createSupabaseReplyRepo } from "@/lib/outreach/supabase-reply-repo";

export const runtime = "nodejs";

/**
 * Unipile's "new messages" webhook (source: messaging). It also carries the messages we send ourselves, so the sender
 * is compared with the connected account and only a message from the lead stops their sequence.
 */
export async function POST(request: Request) {
  if (!secretMatches(request.headers.get("unipile-auth"), process.env.UNIPILE_WEBHOOK_SECRET)) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ ok: true, ignored: "not json" }); }
  const m = parseIncoming(body);
  if (!m) return NextResponse.json({ ok: true, ignored: "not a message from a lead" });
  try {
    return NextResponse.json({ ok: true, stopped: await createSupabaseReplyRepo().replied(m) });
  } catch {
    return NextResponse.json({ error: "processing failed" }, { status: 500 });
  }
}
