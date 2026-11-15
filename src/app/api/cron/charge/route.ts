import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getPaymentProvider } from "@/lib/payments";
import { chargeDueInvoices } from "@/lib/payments/charge";
import { createSupabaseChargeRepo } from "@/lib/payments/supabase-charge-repo";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function authorised(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const got = Buffer.from(request.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  return got.length === want.length && timingSafeEqual(got, want);
}

/** Daily safety net run by Vercel Cron: retries charges that failed a day ago and picks up any that were missed. */
export async function GET(request: Request) {
  if (!authorised(request)) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  try {
    const { data, error } = await createAdminClient().from("invoice").select("workspace_id").in("stage", [2, 3]).is("paid_at", null).lt("charge_attempts", 3);
    if (error) throw error;
    const workspaces = [...new Set((data ?? []).map((r) => r.workspace_id as string))];
    const deps = { repo: createSupabaseChargeRepo(), provider: getPaymentProvider() };
    let charged = 0;
    for (const ws of workspaces) charged += (await chargeDueInvoices(deps, ws)).filter((o) => o.result === "charging").length;
    return NextResponse.json({ ok: true, workspaces: workspaces.length, charged });
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
