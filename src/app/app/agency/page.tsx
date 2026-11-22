import { redirect } from "next/navigation";
import { TierUpgrade, type TierOption } from "@/components/agency/tier-upgrade";
import { StatCard } from "@/components/dashboard/stat-card";
import { Notice } from "@/components/shell/notice";
import { AGENCY_TIERS, isAgencyTier, roomsLeft } from "@/lib/agency/tiers";
import { upgradeOptions } from "@/lib/agency/upgrade";
import { t } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AgencyPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: m } = await supabase.from("agency_member").select("agency_id,role").eq("user_id", user.id).limit(1);
  const agencyId = m?.[0]?.agency_id as string | undefined;
  if (!agencyId) return <Notice icon="waiting" title={t("agency.empty.title")} body={t("agency.empty.body")} />;

  const [{ data: agency }, { data: used, error }] = await Promise.all([
    supabase.from("agency").select("name,tier").eq("id", agencyId).maybeSingle(),
    supabase.rpc("agency_usage", { p_agency: agencyId }),
  ]);
  if (error || !agency || !isAgencyTier(agency.tier) || typeof used !== "number") {
    return <Notice icon="error" title={t("agency.error.title")} body={t("agency.error.body")} />;
  }

  const tier = AGENCY_TIERS[agency.tier];
  const options: TierOption[] = upgradeOptions(tier.key).map((k) => {
    const o = AGENCY_TIERS[k];
    return { key: k, title: o.title, price: o.monthlyPrice ?? 0, rooms: o.roomLimit, whiteLabel: o.whiteLabel, multiBrand: o.multiBrand };
  });

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-8 lg:px-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-display-sm font-semibold text-primary">{agency.name as string}</h1>
        <p className="text-md text-tertiary">{t("agency.subtitle")}</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3" aria-label={t("agency.title")}>
        <StatCard label={t("agency.plan")} value={tier.title} />
        <StatCard
          label={t("agency.rooms")} value={`${used} / ${tier.roomLimit}`} progress={{ value: Math.min(used, tier.roomLimit), max: tier.roomLimit }}
          hint={t(tier.period === "month" ? "agency.period.month" : "agency.period.total")}
        />
        <StatCard label={t("agency.roomsLeft")} value={String(roomsLeft(tier.key, used))} />
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="upgrade-h">
        <h2 id="upgrade-h" className="text-lg font-semibold text-primary">{t("agency.upgrade.title")}</h2>
        <TierUpgrade options={options} canBuy={m?.[0]?.role === "owner"} />
      </section>
    </main>
  );
}
