"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setCampaignStatus } from "@/app/app/outreach/campaigns/actions";
import { Button } from "@/components/base/buttons/button";
import { t } from "@/lib/i18n";
import type { CampaignStatus } from "@/lib/outreach/workspace";

/**
 * The primary action of the workspace. In the demo (`live: false`) it only flips the pill, so the screen can be tried
 * without a database; on the real page it calls the same database function the campaigns list uses.
 */
export function CampaignStatusButton({ id, status, canEdit, live }: { id: string; status: CampaignStatus; canEdit: boolean; live: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [local, setLocal] = useState<CampaignStatus>(status);
  const shown = live ? status : local;
  const label = shown === "active" ? t("outreach.ws.pause") : t("outreach.ws.resume");

  if (!canEdit || shown === "draft" || shown === "completed") return null;

  function press() {
    const next: "active" | "paused" = shown === "active" ? "paused" : "active";
    if (!live) { setLocal(next); return; }
    start(async () => {
      const r = await setCampaignStatus(id, next);
      if (r.ok) router.refresh();
    });
  }

  return <Button size="sm" isDisabled={pending} onPress={press}>{label}</Button>;
}
