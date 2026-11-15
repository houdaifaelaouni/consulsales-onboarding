"use client";

import { useEffect, useRef, useState } from "react";
import { Badge, Button, Card, Input, Textarea } from "@/components/ui";
import { cn } from "@/lib/cn";
import { ACCESS_ITEMS, type AccessItem } from "@/lib/access/items";
import {
  checkFile, connectedCount, formatBytes, isValidBookingLink, needsAdminFlag, statusOf, type AccessStates,
} from "@/lib/access/logic";
import { t } from "@/lib/i18n";

interface PickedFile { id: string; name: string; size: number; type: string; url: string | null }

export function AccessBoard({ initial }: { initial: AccessStates }) {
  const [states, setStates] = useState<AccessStates>(initial);
  const { done, total } = connectedCount(states, ACCESS_ITEMS.map((i) => i.id));

  const set = (id: string, patch: AccessStates[string]) => setStates((s) => ({ ...s, [id]: patch }));

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-[28px] leading-tight font-semibold tracking-[-0.6px]">{t("access.title")}</h1>
        <p className="text-ink-muted">{t("access.subtitle")}</p>
        <p className="text-[13px] font-medium tracking-[0.4px] text-ink-subtle uppercase" aria-live="polite">{t("access.progress", "en", { done, total })}</p>
      </header>

      <p className="rounded-lg border border-hairline-strong bg-surface-1 px-4 py-3 text-sm text-ink-muted" role="note">{t("access.noPasswords")}</p>

      <ul className="space-y-4">
        {ACCESS_ITEMS.map((item) => (
          <li key={item.id}>
            <ItemCard item={item} state={states[item.id]} onChange={(p) => set(item.id, p)} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function ItemCard({ item, state, onChange }: { item: AccessItem; state: AccessStates[string]; onChange: (p: AccessStates[string]) => void }) {
  const status = statusOf({ [item.id]: state }, item.id);
  const flagged = needsAdminFlag(state);
  const hid = `h-${item.id}`;
  return (
    <Card className="space-y-4" role="group" aria-labelledby={hid}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 id={hid} className="text-[22px] leading-snug font-medium tracking-[-0.4px]">{item.title}</h2>
          <p className="text-ink-muted">{item.why}</p>
        </div>
        <Badge tone={status === "connected" ? "success" : "neutral"} className="shrink-0">{t(`access.status.${status}` as "access.status.pending")}</Badge>
      </div>

      <details className="group text-sm text-ink-muted">
        <summary className="min-h-10 cursor-pointer py-2 text-ink">{t("access.how")}</summary>
        <ol className="list-decimal space-y-1 pl-5">{item.steps.map((s) => <li key={s}>{s}</li>)}</ol>
      </details>

      {status === "blocked" && (
        <div className="space-y-2 border-l-2 border-ink pl-3 text-sm" role="status">
          {state?.blockedSince && <p className="text-ink">{t("access.blockedSince", "en", { when: new Date(state.blockedSince).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) })}</p>}
          <p className="text-ink-muted">{t("access.blockedHelp", "en", { text: item.blockedHelp })}</p>
          {flagged && <p className="text-ink">{t("access.flagged")}</p>}
          <Button variant="secondary" onClick={() => onChange({ status: "pending" })}>{t("access.tryAgain")}</Button>
        </div>
      )}

      {status !== "blocked" && (
        <>
          {item.kind === "oauth" && <OAuthAction item={item} state={state} onChange={onChange} />}
          {item.kind === "vault" && <VaultAction state={state} onChange={onChange} />}
          {item.kind === "link" && <LinkAction state={state} onChange={onChange} />}
          {item.kind === "files" && <FilesAction state={state} onChange={onChange} />}
          {status !== "connected" && (
            <button type="button" className="min-h-10 text-sm text-ink-subtle underline underline-offset-2 hover:text-ink"
              onClick={() => onChange({ status: "blocked", blockedSince: new Date().toISOString() })}>
              {t("access.reportProblem")}
            </button>
          )}
        </>
      )}
    </Card>
  );
}

type ActionProps = { state: AccessStates[string]; onChange: (p: AccessStates[string]) => void };

function OAuthAction({ item, state, onChange }: ActionProps & { item: AccessItem }) {
  if (state?.status === "connected") return <p className="text-success">✓ {state.detail}</p>;
  return (
    <div className="flex flex-wrap gap-3">
      {item.providers?.map((p) => (
        // Demo only: the real flow redirects to the provider and returns with the account name.
        <Button key={p} variant="secondary" onClick={() => onChange({ status: "connected", detail: `${p} · Studio North` })}>
          {t("access.connectTo", "en", { provider: p })}
        </Button>
      ))}
    </div>
  );
}

function VaultAction({ state, onChange }: ActionProps) {
  const [secret, setSecret] = useState("");
  if (state?.status === "connected") return <p className="text-success">✓ {t("access.stored", "en", { when: t("access.justNow") })}</p>;
  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (secret.trim()) { setSecret(""); onChange({ status: "connected" }); } }}>
      <label htmlFor="vault-secret" className="block text-sm font-medium">{t("access.secretLabel")}</label>
      <Textarea id="vault-secret" value={secret} onChange={(e) => setSecret(e.target.value)} autoComplete="off" spellCheck={false} aria-describedby="vault-hint" />
      <p id="vault-hint" className="text-sm text-ink-subtle">{t("access.secretHint")}</p>
      <Button type="submit" disabled={!secret.trim()}>{t("access.saveSecure")}</Button>
    </form>
  );
}

function LinkAction({ state, onChange }: ActionProps) {
  const [value, setValue] = useState("");
  const [invalid, setInvalid] = useState(false);
  if (state?.status === "connected") return <p className="text-success">✓ {state.detail}</p>;
  return (
    <form className="space-y-3" onSubmit={(e) => {
      e.preventDefault();
      if (!isValidBookingLink(value)) { setInvalid(true); return; }
      onChange({ status: "connected", detail: value.trim() });
    }}>
      <label htmlFor="booking-link" className="block text-sm font-medium">{t("access.linkLabel")}</label>
      <Input id="booking-link" type="url" inputMode="url" value={value} aria-invalid={invalid || undefined} aria-describedby={invalid ? "booking-err" : undefined}
        onChange={(e) => { setValue(e.target.value); setInvalid(false); }} placeholder="https://cal.com/you/30min" />
      {invalid && <p id="booking-err" role="alert" className="border-l-2 border-ink pl-3 text-sm text-ink">{t("access.linkInvalid")}</p>}
      <Button type="submit">{t("access.save")}</Button>
    </form>
  );
}

function FilesAction({ onChange }: ActionProps) {
  const [files, setFiles] = useState<PickedFile[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const urls = useRef<string[]>([]);
  useEffect(() => () => urls.current.forEach(URL.revokeObjectURL), []);

  function add(list: FileList | null) {
    if (!list) return;
    const next: PickedFile[] = [];
    const errs: string[] = [];
    for (const f of Array.from(list)) {
      const r = checkFile(f);
      if (!r.ok) { errs.push(t(r.reason === "too_big" ? "access.fileTooBig" : r.reason === "empty" ? "access.fileEmpty" : "access.fileType", "en", { name: f.name })); continue; }
      const url = f.type.startsWith("image/") ? URL.createObjectURL(f) : null;
      if (url) urls.current.push(url);
      next.push({ id: `${f.name}-${f.size}-${f.lastModified}`, name: f.name, size: f.size, type: f.type, url });
    }
    setErrors(errs);
    const merged = [...files, ...next.filter((n) => !files.some((x) => x.id === n.id))];
    setFiles(merged);
    onChange({ status: merged.length ? "connected" : "pending", detail: `${merged.length}` });
  }

  function remove(id: string) {
    const merged = files.filter((f) => f.id !== id);
    setFiles(merged);
    onChange({ status: merged.length ? "connected" : "pending", detail: `${merged.length}` });
  }

  return (
    <div className="space-y-3">
      <label className={cn("flex min-h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-hairline-strong px-4 py-6 text-center hover:bg-surface-2 focus-within:border-accent")}>
        <span className="font-medium">{t("access.dropTitle")}</span>
        <span className="text-sm text-ink-subtle">{t("access.dropHint")}</span>
        <input type="file" multiple accept="image/*,application/pdf" className="sr-only" onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
      </label>
      {errors.length > 0 && <ul role="alert" className="space-y-1 border-l-2 border-ink pl-3 text-sm text-ink">{errors.map((m) => <li key={m}>{m}</li>)}</ul>}
      {files.length > 0 && (
        <ul className="divide-y divide-hairline overflow-hidden rounded-lg border border-hairline">
          {files.map((f) => (
            <li key={f.id} className="flex items-center gap-3 bg-surface-1 px-3 py-2">
              {f.url ? (
                // eslint-disable-next-line @next/next/no-img-element -- local blob preview, not optimisable
                <img src={f.url} alt="" className="size-12 shrink-0 rounded-md border border-hairline object-cover" />
              ) : (
                <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-md border border-hairline bg-surface-2 text-xs text-ink-subtle">PDF</span>
              )}
              <span className="min-w-0 flex-1"><span className="block truncate">{f.name}</span><span className="text-sm text-ink-subtle">{formatBytes(f.size)}</span></span>
              <button type="button" className="min-h-10 px-2 text-sm text-ink-subtle hover:text-ink" aria-label={t("access.remove", "en", { name: f.name })} onClick={() => remove(f.id)}>✕</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
