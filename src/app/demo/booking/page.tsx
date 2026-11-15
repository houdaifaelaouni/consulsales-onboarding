"use client";

import { useMemo, useState } from "react";
import { BookingPicker, type BookingStore } from "@/components/booking/booking-picker";
import { Select } from "@/components/ui";
import { generateSlots, KICKOFF_MINUTES, type BookingPlan } from "@/lib/booking/logic";
import { t } from "@/lib/i18n";

// Fixed demo clock (a Sunday) so the page is stable.
const NOW = "2026-11-15T12:00:00Z";

export default function DemoBooking() {
  const [plan, setPlan] = useState<BookingPlan>("pro");
  const [fail, setFail] = useState(false);
  // Pretend a few Monday slots are already taken by other clients.
  const booked = useMemo(() => generateSlots(new Date(NOW), 30).slice(2, 6), []);
  const store = useMemo<BookingStore>(() => ({
    async book(slot) {
      await new Promise((r) => setTimeout(r, 500));
      if (fail) throw new Error("slot taken");
      return { id: `bk_${slot}` };
    },
  }), [fail]);

  return (
    <main className="mx-auto max-w-xl space-y-6 px-4 py-8 sm:py-12">
      <div className="space-y-2">
        <h1 className="text-[28px] leading-tight font-semibold tracking-[-0.6px]">{t("booking.title")}</h1>
        <p className="text-ink-muted">{t("booking.subtitle", "en", { min: KICKOFF_MINUTES[plan] })}</p>
      </div>

      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-hairline bg-surface-1 px-4 py-3 text-sm text-ink-subtle">
        <label htmlFor="demo-plan">Demo plan</label>
        <Select id="demo-plan" className="w-auto!" value={plan} onChange={(e) => setPlan(e.target.value as BookingPlan)}>
          <option value="starter">Starter (30 min)</option><option value="pro">Pro (45 min)</option><option value="enterprise">Enterprise (60 min)</option>
        </Select>
        <label className="flex min-h-10 items-center gap-2"><input type="checkbox" checked={fail} onChange={(e) => setFail(e.target.checked)} className="size-4" />Simulate a failed booking</label>
      </div>

      <BookingPicker key={plan} plan={plan} now={NOW} booked={booked} store={store} fallbackUrl="https://cal.com" />
    </main>
  );
}
