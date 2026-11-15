"use client";

import { useState } from "react";
import { Check, Copy01 } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { t } from "@/lib/i18n";

/** Copies a name or address, never a secret: the page never has the secret values. */
export function CopyButton({ text, label }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      color="tertiary" size="sm" iconLeading={done ? Check : Copy01} aria-label={`${label ?? t("integrations.copyName")}: ${text}`}
      onPress={async () => { try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); } catch { /* clipboard blocked */ } }}
    >
      {done ? t("integrations.copied") : label ?? ""}
    </Button>
  );
}
