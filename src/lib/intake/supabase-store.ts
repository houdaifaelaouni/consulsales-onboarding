import type { IntakeStore } from "@/components/intake/intake-form";
import { createClient } from "@/lib/supabase/client";
import { intakeSavedEvent, intakeTaskStatus } from "./events";
import { answersToRows, rowsToAnswers } from "./rows";

/** Saves intake answers to the database. Row-level security lets only the client owner write them. */
export function supabaseIntakeStore(workspaceId: string): IntakeStore {
  const supabase = createClient();
  return {
    async load() {
      const { data, error } = await supabase.from("intake_answer").select("question_key,value").eq("workspace_id", workspaceId);
      if (error) throw new Error("load failed");
      return rowsToAnswers(data ?? []);
    },
    async save(answers) {
      const rows = answersToRows(answers).map((r) => ({ ...r, workspace_id: workspaceId }));
      if (rows.length === 0) return;
      const { error } = await supabase.from("intake_answer").upsert(rows, { onConflict: "workspace_id,question_key" });
      if (error) throw new Error("save failed");
      // Keep the onboarding task in step with the answers. Best effort, like the log entry below.
      await supabase.from("task").update({ status: intakeTaskStatus(answers) }).eq("workspace_id", workspaceId).eq("type", "complete_intake");
      // Best effort: a failed log entry must never lose the client's answers.
      const { data: { user } } = await supabase.auth.getUser();
      if (user) await supabase.from("event_log").insert({ workspace_id: workspaceId, actor: user.id, ...intakeSavedEvent(answers) });
    },
  };
}
