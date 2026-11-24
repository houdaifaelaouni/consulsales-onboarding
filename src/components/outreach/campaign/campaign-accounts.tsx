"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { assignCampaignAccounts } from "@/app/app/outreach/campaigns/actions";
import { Button } from "@/components/base/buttons/button";
import { PlatformChip } from "@/components/outreach/platform-pills";
import { t } from "@/lib/i18n";
import { splitBudget } from "@/lib/outreach/budget";
import type { ProfileView } from "@/lib/outreach/workspace";
import { cx } from "@/utils/cx";

/**
 * Campaign Accounts and Profiles. One connected account can run several campaigns; the planner splits its daily limit
 * between them, so the panel shows the split instead of promising a fresh limit per campaign.
 */
export function CampaignAccounts({ campaignId, profiles, selected, perDay, campaigns, live, canEdit, profilesHref }: {
  campaignId: string; profiles: ProfileView[]; selected: string[]; perDay: number; campaigns: number; live: boolean; canEdit: boolean; profilesHref: string;
}) {
  const router = useRouter();
  const [chosen, setChosen] = useState<string[]>(selected);
  const [note, setNote] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const perCampaign = splitBudget(perDay, Math.max(1, campaigns));

  function save() {
    if (!live) { setNote(t("outreach.ac.demoSaved")); return; }
    start(async () => {
      const r = await assignCampaignAccounts(campaignId, chosen);
      setNote(r.ok ? t("outreach.ac.saved") : t("outreach.error.failed"));
      if (r.ok) router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <section aria-labelledby="campaign-accounts" className="flex flex-col gap-4 rounded-2xl border border-secondary bg-primary p-5">
        <div className="flex flex-col gap-1">
          <h2 id="campaign-accounts" className="text-lg font-semibold text-primary">{t("outreach.ac.title")}</h2>
          <p className="text-sm text-tertiary">{t("outreach.ac.subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <PlatformChip channel="linkedin" />
        </div>
      </section>

      <section aria-labelledby="campaign-profiles" className="flex flex-col gap-4 rounded-2xl border border-secondary bg-primary p-5">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-baseline gap-2">
            <h2 id="campaign-profiles" className="text-lg font-semibold text-primary">{t("outreach.ac.profiles")}</h2>
            <Link href={profilesHref} className="text-sm font-medium text-brand-secondary hover:underline">{t("outreach.ac.open")}</Link>
          </div>
          <p className="text-sm text-tertiary">{t("outreach.ac.profilesSub")}</p>
          <p className="text-xs leading-5 text-tertiary">{t("outreach.ac.split")}</p>
          <p className="text-xs leading-5 text-tertiary">{t("outreach.ac.splitValue", "en", { n: perCampaign, total: perDay })}</p>
        </div>

        {profiles.length === 0 ? (
          <p className="rounded-xl bg-secondary p-4 text-center text-sm text-tertiary">{t("outreach.ac.none")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {profiles.map((profile) => {
              const on = chosen.includes(profile.id);
              return (
                <li key={profile.id}>
                  <label className={cx("flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3", on ? "border-brand bg-secondary" : "border-secondary")}>
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-sm font-medium text-primary">{profile.name}</span>
                      <span className="text-xs text-tertiary">{t("outreach.ac.runs", "en", { n: profile.campaigns })}</span>
                    </span>
                    <input type="checkbox" checked={on} disabled={!canEdit} aria-label={profile.name}
                      onChange={(e) => setChosen((c) => (e.target.checked ? [...c, profile.id] : c.filter((id) => id !== profile.id)))} />
                  </label>
                </li>
              );
            })}
          </ul>
        )}

        {note && <p role="status" className="text-sm text-secondary">{note}</p>}
        {canEdit && profiles.length > 0 && (
          <div><Button size="sm" color="secondary" isDisabled={pending} onPress={save}>{t("outreach.ac.save")}</Button></div>
        )}
      </section>
    </div>
  );
}
