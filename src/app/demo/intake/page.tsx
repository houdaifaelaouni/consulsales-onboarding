"use client";

import { useMemo } from "react";
import { IntakeForm } from "@/components/intake/intake-form";
import { localIntakeStore } from "@/lib/intake/local-store";

export default function DemoIntake() {
  const store = useMemo(() => localIntakeStore(), []);
  return (
    <main className="mx-auto max-w-xl px-4 py-8 sm:py-12">
      <IntakeForm store={store} />
    </main>
  );
}
