"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/base/buttons/button";
import { BAZOOKA, bookingPageUrl, buildEmbedConfig } from "@/lib/booking/bazooka";
import { t } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";

type Fn = (...args: unknown[]) => void;
type BazookaGlobal = { (...args: unknown[]): void; q?: unknown[]; ns?: Record<string, Fn & { q?: unknown[] }>; loaded?: number };

const SLOW_MS = 10_000;

/** Loads the founder's booking tool (one fixed script) and shows it inline, prefilled with the client's details. */
export function KickoffBooking({ link, workspaceId, name, email }: { link: string; workspaceId: string; name: string; email: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [slow, setSlow] = useState(false);
  const [booked, setBooked] = useState(false);

  useEffect(() => {
    const w = window as unknown as { Bazooka?: BazookaGlobal };
    // The same loader the vendor's own snippet uses, with our fixed address in place of a pasted one.
    const b: BazookaGlobal = (w.Bazooka = w.Bazooka ?? ((...a: unknown[]) => {
      const f = w.Bazooka as BazookaGlobal;
      if (a[0] === "init" && typeof a[1] === "string" && f.ns && !f.ns[a[1]]) { const n = (f.ns[a[1]] = ((...x: unknown[]) => { (n.q ??= []).push(x); }) as Fn & { q?: unknown[] }); n.q = []; }
      (f.q ??= []).push(a);
    }) as BazookaGlobal);
    b.q = b.q ?? []; b.ns = b.ns ?? {};
    if (!b.loaded) { b.loaded = 1; const s = document.createElement("script"); s.src = BAZOOKA.script; s.async = true; document.head.appendChild(s); }

    try {
      (b as unknown as Fn)("init", BAZOOKA.namespace, { origin: BAZOOKA.origin });
      const ns = b.ns![BAZOOKA.namespace];
      ns("inline", { elementOrSelector: box.current, bookingLink: link, config: buildEmbedConfig({ name, email }) });
      // Best effort: if the tool reports a finished booking, tick the "book kickoff" task.
      ns("on", { action: "bookingSuccessful", callback: () => { setBooked(true); void createClient().from("task").update({ status: "done" }).eq("workspace_id", workspaceId).eq("type", "book_kickoff"); } });
    } catch { setSlow(true); }

    const timer = setTimeout(() => { if (!box.current?.querySelector("iframe")) setSlow(true); }, SLOW_MS);
    return () => clearTimeout(timer);
  }, [link, workspaceId, name, email]);

  return (
    <div className="flex flex-col gap-4">
      {booked && <p role="status" className="rounded-lg bg-success-secondary p-3 text-sm text-success-primary">{t("booking.live.done")}</p>}
      <div ref={box} className="min-h-[560px] w-full overflow-auto rounded-xl bg-primary ring-1 ring-secondary" aria-label={t("booking.title")} />
      {slow && (
        <div role="status" className="flex flex-col items-start gap-2 rounded-xl bg-secondary p-4 ring-1 ring-secondary">
          <p className="text-sm text-secondary">{t("booking.live.slow")}</p>
          <Button size="sm" color="secondary" href={bookingPageUrl(link)} target="_blank" rel="noopener noreferrer">{t("booking.live.open")}</Button>
        </div>
      )}
    </div>
  );
}
