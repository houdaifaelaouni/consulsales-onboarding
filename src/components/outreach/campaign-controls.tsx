"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setCampaignStatus, syncCampaign } from "@/app/app/outreach/campaigns/actions";
import { Button } from "@/components/base/buttons/button";
import { t } from "@/lib/i18n";

export function CampaignControls({ id, status, canEdit }: { id: string; status: "active" | "paused"; canEdit: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [note, setNote] = useState<string | null>(null);
  if (!canEdit) return null;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" color="secondary" isDisabled={pending} onPress={() => start(async () => { const r = await setCampaignStatus(id, status === "active" ? "paused" : "active"); if (r.ok) router.refresh(); })}>
          {t(status === "active" ? "outreach.camp.pause" : "outreach.camp.resume")}
        </Button>
        <Button size="sm" color="link-gray" isDisabled={pending} onPress={() => start(async () => { const r = await syncCampaign(id); setNote(r.ok ? t("outreach.camp.synced", "en", { n: r.count }) : t("outreach.camp.error.failed")); if (r.ok) router.refresh(); })}>
          {t("outreach.camp.sync")}
        </Button>
      </div>
      {note && <p role="status" className="text-sm text-secondary">{note}</p>}
    </div>
  );
}
