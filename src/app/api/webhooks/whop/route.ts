import { NextResponse } from "next/server";
import { provisionWorkspace } from "@/lib/onboarding/provision";
import { createSupabaseProvisionRepo } from "@/lib/onboarding/supabase-repo";
import { getPaymentProvider } from "@/lib/payments";
import { handlePayment } from "@/lib/payments/handle";
import { createSupabaseStageRepo } from "@/lib/payments/supabase-stage-repo";

export const runtime = "nodejs";

export async function POST(request: Request) {
  // Raw body is required: the signature covers the exact bytes sent.
  const raw = await request.text();
  const provider = getPaymentProvider();

  let event;
  try {
    event = provider.parseWebhook(raw, Object.fromEntries(request.headers));
  } catch {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }
  if (event.kind === "ignored") return NextResponse.json({ ok: true, ignored: event.type });

  try {
    const res = await handlePayment(
      { env: process.env, stageRepo: createSupabaseStageRepo(), provision: (p) => provisionWorkspace(createSupabaseProvisionRepo(), provider.name, p) },
      event.payment,
    );
    if (res.status !== 200) console.error("whop webhook not accepted", event.payment.eventId, String(res.body.error));
    return NextResponse.json(res.body, { status: res.status });
  } catch (err) {
    // Never log payloads or secrets; the event id is enough to find it in the provider dashboard.
    console.error("whop webhook failed", event.payment.eventId, err instanceof Error ? err.message : "unknown");
    return NextResponse.json({ error: "processing failed" }, { status: 500 });
  }
}
