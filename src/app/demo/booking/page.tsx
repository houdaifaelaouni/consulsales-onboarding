"use client";

import { useMemo, useState } from "react";
import { BookingPicker, type BookingStore } from "@/components/booking/booking-picker";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { Select } from "@/components/base/select/select";
import { generateSlots, KICKOFF_MINUTES, type BookingPlan } from "@/lib/booking/logic";
import { t } from "@/lib/i18n";

// Fixed demo clock (a Sunday) so the page is stable.
const NOW = "2026-11-15T12:00:00Z";
const PLANS = [{ id: "starter", label: "Starter (30 min)" }, { id: "pro", label: "Pro (45 min)" }, { id: "enterprise", label: "Enterprise (60 min)" }];

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
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8 lg:px-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-display-sm font-semibold text-primary">{t("booking.title")}</h1>
        <p className="text-md text-tertiary">{t("booking.subtitle", "en", { min: KICKOFF_MINUTES[plan] })}</p>
      </header>

      <div className="flex flex-wrap items-end gap-4 rounded-xl bg-secondary p-4 ring-1 ring-secondary">
        <Select size="sm" label="Demo plan" className="w-52" items={PLANS} selectedKey={plan} onSelectionChange={(k) => setPlan(String(k) as BookingPlan)}>
          {(item) => <Select.Item id={item.id} label={item.label} />}
        </Select>
        <Checkbox isSelected={fail} onChange={setFail} label="Simulate a failed booking" />
      </div>

      <div className="rounded-xl bg-primary p-6 shadow-xs ring-1 ring-secondary">
        <BookingPicker key={plan} plan={plan} now={NOW} booked={booked} store={store} fallbackUrl="https://cal.com" />
      </div>
    </main>
  );
}
