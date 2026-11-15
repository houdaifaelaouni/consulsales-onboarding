"use client";

import { useMemo } from "react";
import { WelcomeFlow } from "@/components/welcome/welcome-flow";
import type { BookingStore } from "@/components/booking/booking-picker";

// Sample client and a fixed clock so the page is stable. The live version reads the signed-in client and the real booking tool.
const NOW = "2026-11-15T12:00:00Z";

export default function WelcomePage() {
  const store = useMemo<BookingStore>(() => ({ async book(slot) { await new Promise((r) => setTimeout(r, 400)); return { id: `bk_${slot}` }; } }), []);
  return <WelcomeFlow name="Sara" plan="pro" now={NOW} dashboardHref="/demo" store={store} />;
}
