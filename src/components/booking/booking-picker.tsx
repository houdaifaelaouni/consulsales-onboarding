"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Card, EmptyState, Skeleton } from "@/components/ui";
import { cn } from "@/lib/cn";
import { t } from "@/lib/i18n";
import { buildIcs, describeSlot, generateSlots, groupSlotsByDay, KICKOFF_MINUTES, type BookingPlan } from "@/lib/booking/logic";

export interface BookingStore {
  /** Books the slot with the booking tool. Rejects if the slot was just taken or the tool is down. */
  book(slotIso: string): Promise<{ id: string }>;
}

type Phase = "pick" | "booking" | "done";

export function BookingPicker({ plan, now, booked, store, fallbackUrl }: {
  plan: BookingPlan; now: string; booked: string[]; store: BookingStore; fallbackUrl?: string;
}) {
  const minutes = KICKOFF_MINUTES[plan];
  const [tz, setTz] = useState<string | null>(null);
  const [dayKey, setDayKey] = useState<string | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("pick");
  const [failed, setFailed] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);

  // Time zone is only known in the browser, so the first render shows a skeleton to avoid a mismatch.
  useEffect(() => { setTz(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"); }, []);

  const days = useMemo(() => (tz ? groupSlotsByDay(generateSlots(new Date(now), minutes, booked), tz) : []), [tz, now, minutes, booked]);
  const day = days.find((d) => d.key === dayKey) ?? days[0];

  if (!tz) {
    return <div role="status" aria-label={t("booking.loading")} className="space-y-4"><Skeleton className="h-8 w-2/3" /><Skeleton className="h-12 w-full" /><Skeleton className="h-28 w-full" /></div>;
  }

  async function confirm() {
    if (!slot) return;
    setPhase("booking"); setFailed(false);
    try { const r = await store.book(slot); setBookingId(r.id); setPhase("done"); }
    catch { setFailed(true); setPhase("pick"); }
  }

  function downloadIcs() {
    if (!slot) return;
    const ics = buildIcs({
      uid: `kickoff-${bookingId ?? slot}@consulsales`, title: "ConsulSales kickoff call", startIso: slot, durationMin: minutes,
      description: "Kickoff call with your ConsulSales delivery lead.",
    });
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = "consulsales-kickoff.ics"; a.click();
    URL.revokeObjectURL(url);
  }

  if (phase === "done" && slot) {
    return (
      <Card className="space-y-4" role="status">
        <h2 className="text-[22px] font-medium tracking-[-0.4px]"><span aria-hidden className="text-success">✓ </span>{t("booking.done.title")}</h2>
        <p className="text-ink-muted">{t("booking.done.body", "en", { when: describeSlot(slot, tz) })}</p>
        <p className="text-sm text-ink-subtle">{t("booking.tz", "en", { tz })}</p>
        <div className="flex flex-wrap gap-3">
          <Button onClick={downloadIcs}>{t("booking.ics")}</Button>
          <Button variant="secondary" onClick={() => { setPhase("pick"); setSlot(null); setBookingId(null); }}>{t("booking.reschedule")}</Button>
        </div>
      </Card>
    );
  }

  if (days.length === 0) {
    return (
      <EmptyState
        title={t("booking.empty.title")} body={t("booking.empty.body")}
        action={fallbackUrl ? <a href={fallbackUrl} className="inline-flex min-h-10 items-center rounded-md border border-hairline bg-surface-1 px-3.5 text-sm font-medium hover:bg-surface-2">{t("booking.fallback")}</a> : undefined}
      />
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-ink-subtle">{t("booking.tz", "en", { tz })}</p>

      <fieldset className="space-y-3">
        <legend className="text-[13px] font-medium tracking-[0.4px] text-ink-subtle uppercase">{t("booking.day")}</legend>
        <div className="flex flex-wrap gap-2">
          {days.map((d) => (
            <button key={d.key} type="button" aria-pressed={d.key === day.key} onClick={() => { setDayKey(d.key); setSlot(null); }}
              className={cn("min-h-10 rounded-md border px-3 text-sm transition-colors", d.key === day.key ? "border-primary text-ink" : "border-hairline text-ink-muted hover:bg-surface-1")}>
              {d.label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-[13px] font-medium tracking-[0.4px] text-ink-subtle uppercase">{t("booking.time")}</legend>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {day.slots.map((s) => (
            <button key={s.iso} type="button" aria-pressed={slot === s.iso} onClick={() => setSlot(s.iso)}
              className={cn("min-h-11 rounded-md border text-sm transition-colors", slot === s.iso ? "border-primary text-ink" : "border-hairline text-ink-muted hover:bg-surface-1")}>
              {s.label}
            </button>
          ))}
        </div>
      </fieldset>

      {failed && (
        <div role="alert" className="space-y-2 border-l-2 border-ink pl-3 text-sm text-ink">
          <p>{t("booking.error")}</p>
          {fallbackUrl && <a href={fallbackUrl} className="underline underline-offset-2">{t("booking.fallback")}</a>}
        </div>
      )}

      <div className="space-y-3 border-t border-hairline pt-4">
        {slot && <p className="text-ink-muted" aria-live="polite">{t("booking.selected", "en", { when: describeSlot(slot, tz) })}</p>}
        <Button className="w-full sm:w-auto" disabled={!slot || phase === "booking"} onClick={confirm}>
          {phase === "booking" ? t("booking.confirming") : t("booking.confirm")}
        </Button>
      </div>
    </div>
  );
}
