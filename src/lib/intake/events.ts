import { answeredCount, isComplete, type Answers } from "./logic";

export interface IntakeEvent { action: "intake.saved"; detail: { answered: number } }

/** Event for an autosave. Counts only: never the answers themselves, which may hold personal data. */
export function intakeSavedEvent(answers: Answers): IntakeEvent {
  const answered = Object.values(answers).filter((a) => a && (a.value || a.notSure)).length;
  return { action: "intake.saved", detail: { answered } };
}

export type IntakeTaskStatus = "todo" | "in_progress" | "done";

/** Where the "complete intake" task stands, from the saved answers. */
export function intakeTaskStatus(answers: Answers): IntakeTaskStatus {
  const { done } = answeredCount(answers);
  if (done === 0) return "todo";
  return isComplete(answers) ? "done" : "in_progress";
}
