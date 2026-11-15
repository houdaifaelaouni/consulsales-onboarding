import type { Answers } from "./logic";

export interface IntakeEvent { action: "intake.saved"; detail: { answered: number } }

/** Event for an autosave. Counts only: never the answers themselves, which may hold personal data. */
export function intakeSavedEvent(answers: Answers): IntakeEvent {
  const answered = Object.values(answers).filter((a) => a && (a.value || a.notSure)).length;
  return { action: "intake.saved", detail: { answered } };
}
