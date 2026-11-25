"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy01 } from "@untitledui/icons";
import { duplicateCampaign } from "@/app/app/outreach/campaigns/actions";
import { Button } from "@/components/base/buttons/button";
import { t } from "@/lib/i18n";

export function DuplicateButton({ id, canEdit }: { id: string; canEdit: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [note, setNote] = useState<string | null>(null);
  if (!canEdit) return null;
  return (
    <div className="flex flex-col gap-1">
      <Button size="sm" color="secondary" iconLeading={Copy01} isDisabled={pending} aria-label={t("outreach.cl.duplicate")}
        onPress={() => start(async () => {
          const r = await duplicateCampaign(id);
          setNote(r.ok ? t("outreach.cl.duplicated") : t("outreach.error.failed"));
          if (r.ok) router.refresh();
        })} />
      {note && <span role="status" className="text-xs text-tertiary">{note}</span>}
    </div>
  );
}
