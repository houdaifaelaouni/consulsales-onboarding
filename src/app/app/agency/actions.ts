"use server";

import { getViewer } from "@/lib/auth/viewer";
import { AGENCY_TIERS, isAgencyTier, tierPrice } from "@/lib/agency/tiers";
import { checkUpgrade } from "@/lib/agency/upgrade";
import { getPaymentProvider } from "@/lib/payments";
import { createClient } from "@/lib/supabase/server";

export type CheckoutResult = { ok: true; checkoutId: string } | { ok: false; reason: "forbidden" | "not_upgrade" | "unavailable" | "failed" };

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

/** Starts a Whop checkout for a higher agency tier. The tier itself only changes later, when the verified payment arrives at the webhook. */
export async function startTierCheckout(requested: string): Promise<CheckoutResult> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, reason: "forbidden" };
  const supabase = await createClient();
  const { data: m } = await supabase.from("agency_member").select("agency_id,role").eq("user_id", viewer.id).limit(1);
  const agencyId = m?.[0]?.agency_id as string | undefined;
  if (!agencyId) return { ok: false, reason: "forbidden" };
  const { data: a } = await supabase.from("agency").select("tier").eq("id", agencyId).maybeSingle();
  if (!isAgencyTier(a?.tier)) return { ok: false, reason: "forbidden" };

  const check = checkUpgrade({ current: a.tier, requested, role: (m?.[0]?.role as string | null) ?? null, env: process.env });
  if (!check.ok) return { ok: false, reason: check.reason };
  try {
    const c = await getPaymentProvider().createCheckout({
      plan: check.tier, title: `ConsulSales agency ${AGENCY_TIERS[check.tier].title}`, amount: tierPrice(check.tier), currency: "eur",
      redirectUrl: `${appUrl()}/app/agency`, metadata: { agency_id: agencyId }, variantId: check.planId,
    });
    return { ok: true, checkoutId: c.id };
  } catch {
    return { ok: false, reason: "failed" };
  }
}
