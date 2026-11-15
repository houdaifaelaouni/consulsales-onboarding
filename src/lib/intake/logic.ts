import { QUESTIONS, STEPS, type Question } from "./questions";

/** An answer is a value, or "not sure" with an optional note (FR-08). */
export interface Answer { value: string; notSure?: boolean; note?: string }
export type Answers = Record<string, Answer | undefined>;

export function questionsForStep(step: number): Question[] {
  return QUESTIONS.filter((q) => q.step === step);
}

/** A question counts as answered if it has a value, or is marked "not sure". */
export function isAnswered(a: Answer | undefined): boolean {
  if (!a) return false;
  return a.notSure === true || a.value.trim().length > 0;
}

export function missingRequired(step: number, answers: Answers): Question[] {
  return questionsForStep(step).filter((q) => q.required && !isAnswered(answers[q.key]));
}

export function isStepComplete(step: number, answers: Answers): boolean {
  return missingRequired(step, answers).length === 0;
}

export function firstIncompleteStep(answers: Answers): number {
  const hit = STEPS.find((s) => !isStepComplete(s.id, answers));
  return hit ? hit.id : STEPS[STEPS.length - 1].id;
}

export function isComplete(answers: Answers): boolean {
  return STEPS.every((s) => isStepComplete(s.id, answers));
}

/** Estimated minutes left: sum of unanswered questions, rounded up, at least 1 while unfinished. */
export function minutesLeft(answers: Answers): number {
  const left = QUESTIONS.filter((q) => !isAnswered(answers[q.key])).reduce((n, q) => n + q.minutes, 0);
  return left === 0 ? 0 : Math.max(1, Math.ceil(left));
}

export function answeredCount(answers: Answers): { done: number; total: number } {
  return { done: QUESTIONS.filter((q) => isAnswered(answers[q.key])).length, total: QUESTIONS.length };
}
