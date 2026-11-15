"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle, UploadCloud02, XClose } from "@untitledui/icons";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { TextArea } from "@/components/base/textarea/textarea";
import { StatCard } from "@/components/dashboard/stat-card";
import { ACCESS_ITEMS, type AccessItem } from "@/lib/access/items";
import { checkFile, connectedCount, formatBytes, isValidBookingLink, needsAdminFlag, statusOf, type AccessStates } from "@/lib/access/logic";
import { t } from "@/lib/i18n";
import { cx } from "@/utils/cx";

interface PickedFile { id: string; name: string; size: number; type: string; url: string | null }
const STATUS_COLOR = { connected: "success", pending: "gray", blocked: "error" } as const;

export function AccessBoard({ initial, onChange }: { initial: AccessStates; onChange?: (id: string, state: NonNullable<AccessStates[string]>) => void }) {
  const [states, setStates] = useState<AccessStates>(initial);
  const { done, total } = connectedCount(states, ACCESS_ITEMS.map((i) => i.id));
  const set = (id: string, patch: AccessStates[string]) => {
    setStates((s) => ({ ...s, [id]: patch }));
    if (patch) onChange?.(id, patch);
  };

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-8 lg:px-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-display-sm font-semibold text-primary">{t("access.title")}</h1>
        <p className="text-md text-tertiary">{t("access.subtitle")}</p>
      </header>

      <StatCard label={t("access.title")} value={t("access.progress", "en", { done, total })} progress={{ value: done, max: total }} />

      <p className="flex items-start gap-2 rounded-xl bg-secondary p-4 text-sm text-secondary ring-1 ring-secondary" role="note">
        <AlertCircle aria-hidden className="mt-0.5 size-5 shrink-0 text-fg-quaternary" />
        {t("access.noPasswords")}
      </p>

      <ul className="flex flex-col gap-4">
        {ACCESS_ITEMS.map((item) => (
          <li key={item.id}><ItemCard item={item} state={states[item.id]} onChange={(p) => set(item.id, p)} /></li>
        ))}
      </ul>
    </main>
  );
}

type ActionProps = { state: AccessStates[string]; onChange: (p: AccessStates[string]) => void };

function ItemCard({ item, state, onChange }: { item: AccessItem } & ActionProps) {
  const status = statusOf({ [item.id]: state }, item.id);
  const flagged = needsAdminFlag(state);
  const hid = `h-${item.id}`;
  return (
    <section role="group" aria-labelledby={hid} className="flex flex-col gap-4 rounded-xl bg-primary p-6 shadow-xs ring-1 ring-secondary">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 id={hid} className="text-lg font-semibold text-primary">{item.title}</h2>
          <p className="text-sm text-tertiary">{item.why}</p>
        </div>
        <Badge size="md" color={STATUS_COLOR[status]} className="shrink-0">{t(`access.status.${status}` as "access.status.pending")}</Badge>
      </div>

      <details className="text-sm text-tertiary">
        <summary className="min-h-10 cursor-pointer py-2 font-medium text-secondary">{t("access.how")}</summary>
        <ol className="list-decimal space-y-1 pl-5">{item.steps.map((s) => <li key={s}>{s}</li>)}</ol>
      </details>

      {status === "blocked" && (
        <div className="flex flex-col gap-3 rounded-lg bg-error-primary p-4 text-sm" role="status">
          {state?.blockedSince && <p className="font-medium text-error-primary">{t("access.blockedSince", "en", { when: new Date(state.blockedSince).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) })}</p>}
          <p className="text-secondary">{t("access.blockedHelp", "en", { text: item.blockedHelp })}</p>
          {flagged && <p className="font-medium text-primary">{t("access.flagged")}</p>}
          <div><Button color="secondary" size="sm" onPress={() => onChange({ status: "pending" })}>{t("access.tryAgain")}</Button></div>
        </div>
      )}

      {status !== "blocked" && (
        <>
          {item.kind === "oauth" && <OAuthAction item={item} state={state} onChange={onChange} />}
          {item.kind === "vault" && <VaultAction state={state} onChange={onChange} />}
          {item.kind === "link" && <LinkAction state={state} onChange={onChange} />}
          {item.kind === "files" && <FilesAction onChange={onChange} />}
          {status !== "connected" && (
            <div><Button color="link-gray" size="sm" onPress={() => onChange({ status: "blocked", blockedSince: new Date().toISOString() })}>{t("access.reportProblem")}</Button></div>
          )}
        </>
      )}
    </section>
  );
}

function Connected({ children }: { children: React.ReactNode }) {
  return <p className="flex items-center gap-2 text-sm font-medium text-success-primary"><CheckCircle aria-hidden className="size-5" />{children}</p>;
}

function OAuthAction({ item, state, onChange }: ActionProps & { item: AccessItem }) {
  if (state?.status === "connected") return <Connected>{state.detail}</Connected>;
  return (
    <div className="flex flex-wrap gap-3">
      {item.providers?.map((p) => (
        // Demo only: the real flow redirects to the provider and returns with the account name.
        <Button key={p} color="secondary" onPress={() => onChange({ status: "connected", detail: `${p} · Studio North` })}>{t("access.connectTo", "en", { provider: p })}</Button>
      ))}
    </div>
  );
}

function VaultAction({ state, onChange }: ActionProps) {
  const [secret, setSecret] = useState("");
  if (state?.status === "connected") return <Connected>{t("access.stored", "en", { when: t("access.justNow") })}</Connected>;
  return (
    <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); if (secret.trim()) { setSecret(""); onChange({ status: "connected" }); } }}>
      <TextArea label={t("access.secretLabel")} hint={t("access.secretHint")} value={secret} onChange={setSecret} rows={3} />
      <div><Button type="submit" isDisabled={!secret.trim()}>{t("access.saveSecure")}</Button></div>
    </form>
  );
}

function LinkAction({ state, onChange }: ActionProps) {
  const [value, setValue] = useState("");
  const [invalid, setInvalid] = useState(false);
  if (state?.status === "connected") return <Connected>{state.detail}</Connected>;
  return (
    <form className="flex flex-col gap-3" onSubmit={(e) => {
      e.preventDefault();
      if (!isValidBookingLink(value)) { setInvalid(true); return; }
      onChange({ status: "connected", detail: value.trim() });
    }}>
      <Input
        label={t("access.linkLabel")} type="url" inputMode="url" placeholder="https://cal.com/you/30min" value={value}
        isInvalid={invalid} hint={invalid ? t("access.linkInvalid") : undefined} onChange={(v) => { setValue(v); setInvalid(false); }}
      />
      <div><Button type="submit">{t("access.save")}</Button></div>
    </form>
  );
}

function FilesAction({ onChange }: Pick<ActionProps, "onChange">) {
  const [files, setFiles] = useState<PickedFile[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const urls = useRef<string[]>([]);
  useEffect(() => () => urls.current.forEach(URL.revokeObjectURL), []);

  function sync(list: PickedFile[]) {
    setFiles(list);
    onChange({ status: list.length ? "connected" : "pending", detail: `${list.length}` });
  }

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
    sync([...files, ...next.filter((n) => !files.some((x) => x.id === n.id))]);
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-primary px-4 py-6 text-center transition hover:bg-primary_hover focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus-ring">
        <UploadCloud02 aria-hidden className="size-6 text-fg-quaternary" />
        <span className="text-sm font-semibold text-brand-secondary">{t("access.dropTitle")}</span>
        <span className="text-sm text-tertiary">{t("access.dropHint")}</span>
        <input type="file" multiple accept="image/*,application/pdf" className="sr-only" onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
      </label>
      {errors.length > 0 && <ul role="alert" className="flex flex-col gap-1 rounded-lg bg-error-primary p-3 text-sm text-error-primary">{errors.map((m) => <li key={m}>{m}</li>)}</ul>}
      {files.length > 0 && (
        <ul className={cx("divide-y divide-secondary overflow-hidden rounded-xl ring-1 ring-secondary")}>
          {files.map((f) => (
            <li key={f.id} className="flex items-center gap-3 bg-primary px-3 py-2">
              {f.url ? (
                // eslint-disable-next-line @next/next/no-img-element -- local blob preview, not optimisable
                <img src={f.url} alt="" className="size-12 shrink-0 rounded-md object-cover ring-1 ring-secondary" />
              ) : (
                <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-md bg-secondary text-xs font-semibold text-tertiary">PDF</span>
              )}
              <span className="flex min-w-0 flex-1 flex-col"><span className="truncate text-sm font-medium text-primary">{f.name}</span><span className="text-xs text-tertiary">{formatBytes(f.size)}</span></span>
              <Button color="tertiary" size="sm" iconLeading={XClose} aria-label={t("access.remove", "en", { name: f.name })} onPress={() => sync(files.filter((x) => x.id !== f.id))} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
