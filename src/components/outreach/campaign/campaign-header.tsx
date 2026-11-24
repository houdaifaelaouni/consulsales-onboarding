import Link from "next/link";
import { ArrowLeft } from "@untitledui/icons";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { CampaignStatusButton } from "@/components/outreach/campaign/campaign-status-button";
import { CampaignTabs } from "@/components/outreach/campaign/campaign-tabs";
import { t } from "@/lib/i18n";
import type { CampaignStatus } from "@/lib/outreach/workspace";
import { STATUS_LABEL, STATUS_TONE } from "@/components/outreach/campaign/status";

export function CampaignHeader({ id, name, status, base, channelsHref, addLeadsHref, canEdit, live }: {
  id: string; name: string; status: CampaignStatus; base: string; channelsHref: string; addLeadsHref: string; canEdit: boolean; live: boolean;
}) {
  return (
    <header className="flex flex-col gap-4">
      <Link href={base} className="flex w-fit items-center gap-2 text-sm font-semibold text-secondary hover:text-primary">
        <ArrowLeft aria-hidden className="size-4" />
        {t("outreach.ws.back")}
      </Link>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex min-w-0 flex-col gap-4">
          <h1 className="text-display-xs font-semibold break-words text-primary">{name}</h1>
          <CampaignTabs id={id} base={base} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" color="secondary" href={channelsHref}>{t("outreach.ws.channels")}</Button>
          <Button size="sm" color="secondary" href={addLeadsHref}>{t("outreach.ws.addLeads")}</Button>
          <CampaignStatusButton id={id} status={status} canEdit={canEdit} live={live} />
          <Badge size="sm" color={STATUS_TONE[status]}>{t(STATUS_LABEL[status])}</Badge>
        </div>
      </div>
    </header>
  );
}
