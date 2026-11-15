"use client";

import { useState } from "react";
import { generateKey, saveKey } from "@/app/admin/integrations/actions";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { t } from "@/lib/i18n";

type State = "idle" | "saving" | "saved" | "error";

/** Paste a key and press Save. The value goes to the server over HTTPS and is cleared from the field at once. */
/** Secrets are masked while typing; ids, addresses and other non-secret settings stay readable so a typo is easy to see. */
export function KeyForm({ name, kind, isSet, generate = false }: { name: string; kind: "public" | "config" | "secret"; isSet: boolean; generate?: boolean }) {
  const [value, setValue] = useState("");
  const [state, setState] = useState<State>("idle");
  const [why, setWhy] = useState<string>("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    setState("saving");
    const res = await saveKey(name, value);
    setValue("");
    if (res.ok) { setState("saved"); window.dispatchEvent(new CustomEvent("keys-saved")); return; }
    setWhy(t(`integrations.err.${res.reason}` as "integrations.err.forbidden"));
    setState("error");
  }

  async function make() {
    setState("saving");
    const res = await generateKey(name);
    if (res.ok) { setState("saved"); window.dispatchEvent(new CustomEvent("keys-saved")); return; }
    setWhy(t(`integrations.err.${res.reason}` as "integrations.err.forbidden"));
    setState("error");
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 bg-secondary p-3 sm:flex-row sm:flex-wrap sm:items-end">
      <div className="w-full min-w-0 sm:flex-1 [&>*]:w-full">
        <Input
          aria-label={t("integrations.paste", "en", { name })} label={isSet ? t("integrations.replace") : t("integrations.pasteShort")}
          type={kind === "secret" ? "password" : "text"} autoComplete="off" value={value} onChange={(v) => { setValue(v); if (state !== "saving") setState("idle"); }}
          placeholder={t("integrations.pastePlaceholder")} size="sm"
        />
      </div>
      <Button type="submit" size="sm" isLoading={state === "saving"} isDisabled={!value.trim()}>{t("integrations.save")}</Button>
      {generate && !isSet && <Button type="button" size="sm" color="secondary" isDisabled={state === "saving"} onPress={make}>{t("integrations.generate")}</Button>}
      <p className="min-h-5 text-sm sm:basis-full" role="status" aria-live="polite">
        {state === "saved" && <span className="text-success-primary">{t("integrations.saved")}</span>}
        {state === "error" && <span role="alert" className="text-error-primary">{why}</span>}
      </p>
    </form>
  );
}
