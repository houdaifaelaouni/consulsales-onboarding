"use client";

import { useMemo } from "react";
import { supabaseIntakeStore } from "@/lib/intake/supabase-store";
import { IntakeForm } from "./intake-form";

export function DbIntake({ workspaceId }: { workspaceId: string }) {
  const store = useMemo(() => supabaseIntakeStore(workspaceId), [workspaceId]);
  return <IntakeForm store={store} />;
}
