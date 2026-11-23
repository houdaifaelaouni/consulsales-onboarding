"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { approveAllNew, setLeadStatus } from "@/app/app/outreach/leads/actions";
import { Button } from "@/components/base/buttons/button";
import { t } from "@/lib/i18n";

type Status = "new" | "approved" | "rejected";

export function LeadRowActions({ id, status, canEdit }: { id: string; status: Status; canEdit: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const set = (s: Status) => start(async () => { const r = await setLeadStatus([id], s); if (r.ok) router.refresh(); });
  if (!canEdit) return null;
  return (
    <div className="flex items-center gap-2">
      {status !== "approved" && <Button size="sm" color="secondary" isDisabled={pending} onPress={() => set("approved")}>{t("outreach.leads.approve")}</Button>}
      {status !== "rejected" && <Button size="sm" color="link-gray" isDisabled={pending} onPress={() => set("rejected")}>{t("outreach.leads.reject")}</Button>}
    </div>
  );
}

export function ApproveAllButton({ count, canEdit }: { count: number; canEdit: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  if (!canEdit || count === 0) return null;
  return <Button size="sm" isDisabled={pending} onPress={() => start(async () => { const r = await approveAllNew(); if (r.ok) router.refresh(); })}>{t("outreach.leads.approveAll", "en", { n: count })}</Button>;
}
