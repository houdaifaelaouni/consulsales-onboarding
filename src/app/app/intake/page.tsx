"use client";

import { useMemo } from "react";
import { IntakeForm } from "@/components/intake/intake-form";
import { PreviewNote } from "@/components/shell/preview-note";
import { localIntakeStore } from "@/lib/intake/local-store";

// TODO(backend): swap the browser store for one that reads and writes intake_answer through RLS.
export default function ClientIntake() {
  const store = useMemo(() => localIntakeStore("app-intake"), []);
  return (<><PreviewNote /><main className="mx-auto max-w-2xl px-4 py-8 lg:px-8"><IntakeForm store={store} /></main></>);
}
