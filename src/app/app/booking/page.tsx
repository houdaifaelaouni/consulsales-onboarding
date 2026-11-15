"use client";

import { useMemo } from "react";
import { BookingPicker, type BookingStore } from "@/components/booking/booking-picker";
import { PreviewNote } from "@/components/shell/preview-note";
import { KICKOFF_MINUTES } from "@/lib/booking/logic";
import { t } from "@/lib/i18n";

// TODO(backend): the store should call the real booking tool (open question Q3) and tick the book_kickoff task.
const NOW = new Date().toISOString();

export default function ClientBooking() {
  const store = useMemo<BookingStore>(() => ({ async book(slot) { await new Promise((r) => setTimeout(r, 400)); return { id: `bk_${slot}` }; } }), []);
  return (
    <>
      <PreviewNote />
      <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8 lg:px-8">
        <header className="flex flex-col gap-1">
          <h1 className="text-display-sm font-semibold text-primary">{t("booking.title")}</h1>
          <p className="text-md text-tertiary">{t("booking.subtitle", "en", { min: KICKOFF_MINUTES.pro })}</p>
        </header>
        <div className="rounded-xl bg-primary p-6 shadow-xs ring-1 ring-secondary"><BookingPicker plan="pro" now={NOW} booked={[]} store={store} fallbackUrl="https://cal.com" /></div>
      </main>
    </>
  );
}
