"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { importLeads, type ImportResult } from "@/app/app/outreach/leads/actions";
import { Button } from "@/components/base/buttons/button";
import { t } from "@/lib/i18n";
import { MAX_FILE_BYTES } from "@/lib/outreach/leads";

/** Pick a CSV, send its text to the server, and show what was added, skipped as duplicates, or left out as unusable. */
export function LeadsUpload({ canEdit }: { canEdit: boolean }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ImportResult | null>(null);

  function pick(file: File | undefined) {
    setResult(null);
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) { setResult({ ok: false, reason: "too_big" }); return; }
    start(async () => {
      const text = await file.text();
      const r = await importLeads(text);
      setResult(r);
      if (r.ok) router.refresh();
      if (input.current) input.current.value = "";
    });
  }

  return (
    <section aria-labelledby="leads-upload" className="flex flex-col gap-3 rounded-xl bg-primary p-6 ring-1 ring-secondary">
      <h2 id="leads-upload" className="text-md font-semibold text-primary">{t("outreach.leads.upload")}</h2>
      <p className="text-sm text-tertiary">{t("outreach.leads.uploadBody")}</p>
      <input ref={input} type="file" accept=".csv,text/csv" className="sr-only" id="leads-file" onChange={(e) => pick(e.target.files?.[0])} disabled={!canEdit || pending} />
      <div><Button isDisabled={!canEdit || pending} onPress={() => input.current?.click()}>{t(pending ? "outreach.leads.reading" : "outreach.leads.choose")}</Button></div>
      {result?.ok && <p role="status" className="rounded-lg bg-secondary p-3 text-sm text-secondary">{t("outreach.leads.done", "en", { added: result.added, dup: result.duplicates, skipped: result.skipped })}</p>}
      {result && !result.ok && <p role="alert" className="rounded-lg bg-error-primary p-3 text-sm text-error-primary">{t(`outreach.leads.error.${result.reason}` as "outreach.leads.error.failed")}</p>}
    </section>
  );
}
