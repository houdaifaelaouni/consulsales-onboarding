"use client";

import { AccessBoard } from "@/components/access/access-board";
import type { AccessStates } from "@/lib/access/logic";

// Sample data: one item connected, one blocked for 80 hours so the admin-alert message shows.
const HOURS = 3_600_000;
const initial: AccessStates = {
  calendar: { status: "connected", detail: "https://cal.com/studio-north/intro" },
  linkedin: { status: "blocked", blockedSince: new Date(Date.now() - 80 * HOURS).toISOString() },
};

export default function DemoAccess() {
  return (
    <main className="mx-auto max-w-xl px-4 py-8 sm:py-12">
      <AccessBoard initial={initial} />
    </main>
  );
}
