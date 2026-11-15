/** Pure logic for the client home. No I/O, so it is easy to test. */
export type TaskStatus = "todo" | "in_progress" | "blocked" | "done";
export interface HomeTask { id: string; type: string; status: TaskStatus; dueAt: string | null }
export type Stage = 1 | 2 | 3;

/** Which stage each task type belongs to. Unknown types fall into stage 1. */
export const TASK_STAGE: Record<string, Stage> = {
  book_kickoff: 1, complete_intake: 1, connect_linkedin: 1, connect_crm: 1, upload_brand_files: 1, approve_icp: 1,
  approve_profile: 2, approve_sequences: 2,
};
export const STAGES: Stage[] = [1, 2, 3];

const DAY_MS = 86_400_000;

/** Day number in the 30-day journey, starting at 1 on the start date. Never below 1. */
export function dayOfJourney(startDate: string, now = new Date()): number {
  const start = new Date(`${startDate}T00:00:00Z`).getTime();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.max(1, Math.floor((today - start) / DAY_MS) + 1);
}

export function stageOf(type: string): Stage {
  return TASK_STAGE[type] ?? 1;
}

export function groupByStage(tasks: HomeTask[]): Record<Stage, HomeTask[]> {
  const groups: Record<Stage, HomeTask[]> = { 1: [], 2: [], 3: [] };
  for (const t of tasks) groups[stageOf(t.type)].push(t);
  for (const s of STAGES) groups[s].sort(byDueThenType);
  return groups;
}

function byDueThenType(a: HomeTask, b: HomeTask): number {
  const ad = a.dueAt ? Date.parse(a.dueAt) : Infinity;
  const bd = b.dueAt ? Date.parse(b.dueAt) : Infinity;
  return ad - bd || a.type.localeCompare(b.type);
}

/** The single next thing to do: earliest-due open task. Blocked tasks come after workable ones. */
export function nextTask(tasks: HomeTask[]): HomeTask | null {
  const open = tasks.filter((t) => t.status !== "done");
  if (open.length === 0) return null;
  const workable = open.filter((t) => t.status !== "blocked");
  return [...(workable.length ? workable : open)].sort(byDueThenType)[0];
}

/** A stage is complete only if it has tasks and all of them are done. */
export function completedStages(tasks: HomeTask[]): number {
  const groups = groupByStage(tasks);
  return STAGES.filter((s) => groups[s].length > 0 && groups[s].every((t) => t.status === "done")).length;
}

export function progress(tasks: HomeTask[]): { done: number; total: number } {
  return { done: tasks.filter((t) => t.status === "done").length, total: tasks.length };
}

/** First name for the greeting: profile name, else the part of the email before @ or +. */
export function firstName(name: string | null | undefined, email: string): string {
  const fromName = name?.trim().split(/\s+/)[0];
  if (fromName) return fromName;
  const local = email.split("@")[0].split("+")[0].split(/[._-]/)[0];
  return local ? local.charAt(0).toUpperCase() + local.slice(1) : email;
}

export type StageState = "done" | "current" | "upcoming";

/** Which stage the client is in: the first one that is not fully done. */
export function stageStates(tasks: HomeTask[]): Record<Stage, StageState> {
  const groups = groupByStage(tasks);
  let currentFound = false;
  const out = {} as Record<Stage, StageState>;
  for (const s of STAGES) {
    const list = groups[s];
    const done = list.length > 0 && list.every((x) => x.status === "done");
    if (done) out[s] = "done";
    else if (!currentFound) { out[s] = "current"; currentFound = true; }
    else out[s] = "upcoming";
  }
  return out;
}

