import { renderTemplate, type StepInput, type TemplateLead } from "./campaign";

/**
 * Test Mode runs in the browser on the real campaign text, with a made-up prospect. It is deterministic (no random, no
 * network, no LLM): the request and the first message go out, the prospect answers, and the reply stops the sequence —
 * exactly the rule the sender follows. Nothing is sent and nothing is stored.
 */
export type TestRole = "agent" | "lead";
export interface TestTurn { role: TestRole; text: string }

export function simulateRun(steps: StepInput[], lead: TemplateLead, reply: string): TestTurn[] {
  const turns: TestTurn[] = [];
  const note = steps[0] ? renderTemplate(steps[0].body, lead).trim() : "";
  if (note) turns.push({ role: "agent", text: note });
  const first = steps[1] ? renderTemplate(steps[1].body, lead).trim() : "";
  if (first) turns.push({ role: "agent", text: first });
  turns.push({ role: "lead", text: reply });
  return turns;
}

/** The prospect Test Mode writes to. A fixed name keeps the transcript identical between runs. */
export const TEST_LEAD: TemplateLead = { fullName: "Sara Lopez", title: "Founder", company: "Studio North" };
