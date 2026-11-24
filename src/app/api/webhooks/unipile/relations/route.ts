import { NextResponse } from "next/server";
import { parseRelation } from "@/lib/outreach/replies";
import { secretMatches } from "@/lib/outreach/secret";
import { createSupabaseReplyRepo } from "@/lib/outreach/supabase-reply-repo";

export const runtime = "nodejs";

/**
 * Unipile's "new relation" webhook (source: users). It is not real time: Unipile polls the connection list, so it can
 * arrive hours after the acceptance. Register it with the custom header `Unipile-Auth` holding UNIPILE_WEBHOOK_SECRET.
 */
export async function POST(request: Request) {
  if (!secretMatches(request.headers.get("unipile-auth"), process.env.UNIPILE_WEBHOOK_SECRET)) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ ok: true, ignored: "not json" }); }
  const r = parseRelation(body);
  if (!r) return NextResponse.json({ ok: true, ignored: "not a new relation" });
  try {
    return NextResponse.json({ ok: true, accepted: await createSupabaseReplyRepo().accepted(r) });
  } catch {
    return NextResponse.json({ error: "processing failed" }, { status: 500 });
  }
}
