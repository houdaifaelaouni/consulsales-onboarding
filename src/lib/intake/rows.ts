import type { Answer, Answers } from "./logic";

export interface AnswerRow { question_key: string; value: Answer }

/** Turns saved database rows back into the form's answers. Ignores malformed values. */
export function rowsToAnswers(rows: ReadonlyArray<{ question_key: string; value: unknown }>): Answers {
  const out: Answers = {};
  for (const r of rows) {
    const v = r.value;
    if (!v || typeof v !== "object" || Array.isArray(v)) continue;
    const o = v as Record<string, unknown>;
    if (typeof o.value !== "string") continue;
    const a: Answer = { value: o.value };
    if (o.notSure === true) a.notSure = true;
    if (typeof o.note === "string" && o.note) a.note = o.note;
    out[r.question_key] = a;
  }
  return out;
}

/** Rows to upsert: only answers that hold something. Who and when are stamped by the database. */
export function answersToRows(answers: Answers): AnswerRow[] {
  const rows: AnswerRow[] = [];
  for (const [key, a] of Object.entries(answers)) {
    if (!a) continue;
    if (!a.value && !a.notSure && !a.note) continue;
    const value: Answer = { value: a.value ?? "" };
    if (a.notSure) value.notSure = true;
    if (a.note) value.note = a.note;
    rows.push({ question_key: key.slice(0, 80), value });
  }
  return rows;
}
