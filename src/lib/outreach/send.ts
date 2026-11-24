/**
 * One sending run: ask the database what is due, decide what the limits allow, send it through Unipile and record
 * each outcome. Everything external is a port, so the run is tested with fakes.
 */
import { renderTemplate } from "./campaign";
import { planSends, type DueSend, type SendBlock, type SendSettings } from "./sender";

/** A workspace the sender may look at: sending switched on the database side, and one healthy LinkedIn account. */
export interface SendWork {
  workspaceId: string;
  accountId: string;
  settings: SendSettings;
  paused: boolean;
  adminStopped: boolean;
  accountStatus: string | null;
  warmupStart: string | null;
}

export interface SendRepo {
  workspaces(): Promise<SendWork[]>;
  due(workspaceId: string, limit: number): Promise<DueSend[]>;
  sentToday(workspaceId: string): Promise<{ invites: number; messages: number }>;
  saveProviderId(workspaceId: string, leadId: string, providerId: string): Promise<void>;
  sent(a: { workspaceId: string; enrollmentId: string; kind: DueSend["kind"]; position: number; chatId: string | null }): Promise<void>;
  failed(a: { workspaceId: string; enrollmentId: string; error: string }): Promise<void>;
}

export interface OutreachSender {
  providerId(a: { accountId: string; linkedinKey: string }): Promise<string | null>;
  invite(a: { accountId: string; providerId: string; note: string }): Promise<void>;
  message(a: { accountId: string; providerId: string; text: string }): Promise<{ chatId: string | null }>;
}

export interface WorkspaceRun {
  workspaceId: string;
  block: SendBlock | null;
  sent: number;
  failed: number;
}

const BATCH = 20;
const message = (e: unknown) => (e instanceof Error ? e.message : "unknown error").slice(0, 280);

/** Sends what one workspace may send now. A failed step never stops the rest of the run. */
export async function runWorkspace(repo: SendRepo, sender: OutreachSender, w: SendWork, now = new Date()): Promise<WorkspaceRun> {
  const [due, sentToday] = await Promise.all([repo.due(w.workspaceId, BATCH * 2), repo.sentToday(w.workspaceId)]);
  const plan = planSends({ now, settings: w.settings, paused: w.paused, adminStopped: w.adminStopped, accountStatus: w.accountStatus, warmupStart: w.warmupStart, sentToday, due, batch: BATCH });
  const run: WorkspaceRun = { workspaceId: w.workspaceId, block: plan.block, sent: 0, failed: 0 };

  for (const d of plan.sends) {
    try {
      const providerId = d.providerId ?? (await sender.providerId({ accountId: w.accountId, linkedinKey: d.linkedinKey }));
      if (!providerId) throw new Error("profile not found");
      if (!d.providerId) await repo.saveProviderId(w.workspaceId, d.leadId, providerId);
      const body = renderTemplate(d.body, { fullName: d.leadName, title: d.leadTitle, company: d.leadCompany });
      let chatId: string | null = d.chatId;
      if (d.kind === "invite") {
        if (d.position !== 0) throw new Error("not an invitation step");
        await sender.invite({ accountId: w.accountId, providerId, note: body });
      } else {
        chatId = (await sender.message({ accountId: w.accountId, providerId, text: body })).chatId ?? chatId;
      }
      await repo.sent({ workspaceId: w.workspaceId, enrollmentId: d.enrollmentId, kind: d.kind, position: d.position, chatId });
      run.sent++;
    } catch (e) {
      await repo.failed({ workspaceId: w.workspaceId, enrollmentId: d.enrollmentId, error: message(e) });
      run.failed++;
    }
  }
  return run;
}

/** Every workspace that is ready. One workspace failing never stops the others. */
export async function runOutreach(repo: SendRepo, sender: OutreachSender, now = new Date(), workspaces?: SendWork[]) {
  const list = workspaces ?? (await repo.workspaces());
  const runs: WorkspaceRun[] = [];
  for (const w of list) {
    try {
      runs.push(await runWorkspace(repo, sender, w, now));
    } catch {
      runs.push({ workspaceId: w.workspaceId, block: null, sent: 0, failed: 0 });
    }
  }
  return { workspaces: list.length, sent: runs.reduce((n, r) => n + r.sent, 0), failed: runs.reduce((n, r) => n + r.failed, 0), runs };
}
