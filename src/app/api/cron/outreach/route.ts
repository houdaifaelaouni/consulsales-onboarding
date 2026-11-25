import { NextResponse } from "next/server";
import { secretMatches } from "@/lib/outreach/secret";
import { runOutreach, type OutreachSender } from "@/lib/outreach/send";
import { createSupabaseSendRepo } from "@/lib/outreach/supabase-send-repo";
import { resolveProviderId, sendInvite, sendMessage } from "@/lib/outreach/unipile-send";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Unipile, behind the sender's port. Keys come from Vercel environment variables, never from a request. */
function unipile(): OutreachSender {
  return {
    providerId: (a) => resolveProviderId({}, a),
    invite: (a) => sendInvite({}, a),
    message: (a) => sendMessage({}, a),
  };
}

function authorised(request: Request): boolean {
  const header = request.headers.get("authorization");
  const got = header?.replace(/^Bearer\s+/i, "") ?? new URL(request.url).searchParams.get("s");
  return secretMatches(got, process.env.CRON_SECRET);
}

/**
 * Every ten minutes: send the connection requests and messages that are due, inside each client's limits.
 * The database refuses anything above the daily caps, so a bug here cannot flood an account.
 */
export async function GET(request: Request) {
  if (!authorised(request)) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  try {
    const result = await runOutreach(createSupabaseSendRepo(), unipile());
    return NextResponse.json({ ok: true, workspaces: result.workspaces, sent: result.sent, failed: result.failed });
  } catch {
    return NextResponse.json({ ok: false, error: "failed" }, { status: 500 });
  }
}
