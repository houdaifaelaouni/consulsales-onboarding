"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarCheck01, CheckCircle } from "@untitledui/icons";
import { EmptyState } from "@/components/application/empty-state/empty-state";
import { Button } from "@/components/base/buttons/button";
import { buildIcs, describeSlot, generateSlots, groupSlotsByDay, KICKOFF_MINUTES, type BookingPlan } from "@/lib/booking/logic";
import { t } from "@/lib/i18n";
import { cx } from "@/utils/cx";

export interface BookingStore {
  /** Books the slot with the booking tool. Rejects if the slot was just taken or the tool is down. */
  book(slotIso: string): Promise<{ id: string }>;
}

type Phase = "pick" | "booking" | "done";

const pill = (on: boolean) =>
  cx("min-h-11 rounded-lg px-3 text-sm font-medium ring-1 ring-inset transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring",
    on ? "bg-secondary text-primary ring-brand" : "bg-primary text-tertiary ring-secondary hover:bg-primary_hover");

export function BookingPicker({ plan, now, booked, store, fallbackUrl, onBooked }: {
  plan: BookingPlan; now: string; booked: string[]; store: BookingStore; fallbackUrl?: string; onBooked?: (slotIso: string) => void;
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
    return (
      <div role="status" aria-label={t("booking.loading")} className="flex flex-col gap-4">
        {["h-8 w-2/3", "h-12 w-full", "h-28 w-full"].map((c) => <div key={c} className={cx("animate-pulse rounded-md bg-quaternary", c)} />)}
      </div>
    );
  }

  async function confirm() {
    if (!slot) return;
    setPhase("booking"); setFailed(false);
    try { const r = await store.book(slot); setBookingId(r.id); setPhase("done"); onBooked?.(slot); }
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
      <div className="flex flex-col gap-4" role="status">
        <h2 className="flex items-center gap-2 text-display-xs font-semibold text-primary"><CheckCircle aria-hidden className="size-6 text-fg-success-primary" />{t("booking.done.title")}</h2>
        <p className="text-md text-tertiary">{t("booking.done.body", "en", { when: describeSlot(slot, tz) })}</p>
        <p className="text-sm text-quaternary">{t("booking.tz", "en", { tz })}</p>
        <div className="flex flex-wrap gap-3">
          <Button onPress={downloadIcs}>{t("booking.ics")}</Button>
          <Button color="secondary" onPress={() => { setPhase("pick"); setSlot(null); setBookingId(null); }}>{t("booking.reschedule")}</Button>
        </div>
      </div>
    );
  }

  if (days.length === 0) {
    return (
      <EmptyState>
        <EmptyState.Header><EmptyState.FeaturedIcon icon={CalendarCheck01} color="gray" /></EmptyState.Header>
        <EmptyState.Content>
          <EmptyState.Title>{t("booking.empty.title")}</EmptyState.Title>
          <EmptyState.Description>{t("booking.empty.body")}</EmptyState.Description>
        </EmptyState.Content>
        {fallbackUrl && <EmptyState.Footer><Button color="secondary" href={fallbackUrl}>{t("booking.fallback")}</Button></EmptyState.Footer>}
      </EmptyState>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-tertiary">{t("booking.tz", "en", { tz })}</p>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 text-sm font-semibold text-secondary">{t("booking.day")}</legend>
        <div className="flex flex-wrap gap-2">
          {days.map((d) => (
            <button key={d.key} type="button" aria-pressed={d.key === day.key} onClick={() => { setDayKey(d.key); setSlot(null); }} className={pill(d.key === day.key)}>{d.label}</button>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 text-sm font-semibold text-secondary">{t("booking.time")}</legend>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {day.slots.map((s) => (
            <button key={s.iso} type="button" aria-pressed={slot === s.iso} onClick={() => setSlot(s.iso)} className={pill(slot === s.iso)}>{s.label}</button>
          ))}
        </div>
      </fieldset>

      {failed && (
        <div role="alert" className="flex flex-col gap-2 rounded-lg bg-error-primary p-3 text-sm text-error-primary">
          <p>{t("booking.error")}</p>
          {fallbackUrl && <a href={fallbackUrl} className="font-medium underline underline-offset-2">{t("booking.fallback")}</a>}
        </div>
      )}

      <div className="flex flex-col gap-3 border-t border-secondary pt-4">
        {slot && <p className="text-md text-secondary" aria-live="polite">{t("booking.selected", "en", { when: describeSlot(slot, tz) })}</p>}
        <div><Button size="lg" isDisabled={!slot || phase === "booking"} onPress={confirm}>{phase === "booking" ? t("booking.confirming") : t("booking.confirm")}</Button></div>
      </div>
    </div>
  );
}
