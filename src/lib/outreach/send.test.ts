import { describe, expect, it, vi } from "vitest";
import { runWorkspace, type OutreachSender, type SendRepo, type SendWork } from "./send";
import type { DueSend } from "./sender";

const monday = new Date("2026-11-24T09:00:00.000Z");

const work: SendWork = {
  workspaceId: "w1", accountId: "acc1", accountStatus: "ok", paused: false, adminStopped: false, warmupStart: null,
  settings: { invitesPerDay: 10, messagesPerDay: 10, workStart: "08:00", workEnd: "18:00", timezone: "Europe/Madrid", weekdaysOnly: true, warmup: false },
};

const invite = (over: Partial<DueSend> = {}): DueSend => ({
  enrollmentId: "e1", leadId: "l1", campaignId: "c1", position: 0, kind: "invite", body: "Hi {first_name}",
  leadName: "Ana Costa", leadTitle: "Founder", leadCompany: "Nova", linkedinKey: "ana-costa",
  providerId: "ACo1", chatId: null, acceptedAt: null, dueAt: "2026-11-23T00:00:00.000Z", ...over,
});

function repo(items: DueSend[]): SendRepo & { sentCalls: unknown[]; failedCalls: unknown[]; providers: unknown[] } {
  const sentCalls: unknown[] = [];
  const failedCalls: unknown[] = [];
  const providers: unknown[] = [];
  return {
    sentCalls, failedCalls, providers,
    workspaces: async () => [work],
    due: async () => items,
    sentToday: async () => ({ invites: 0, messages: 0 }),
    saveProviderId: async (workspaceId, leadId, providerId) => { providers.push({ workspaceId, leadId, providerId }); },
    sent: async (a) => { sentCalls.push(a); },
    failed: async (a) => { failedCalls.push(a); },
  };
}

function sender(over: Partial<OutreachSender> = {}): OutreachSender {
  return {
    providerId: vi.fn(async () => "ACo1"),
    invite: vi.fn(async () => {}),
    message: vi.fn(async () => ({ chatId: "chat1" })),
    ...over,
  };
}

describe("runWorkspace", () => {
  it("sends a due invitation with the rendered note and records it", async () => {
    const r = repo([invite()]);
    const s = sender();
    const out = await runWorkspace(r, s, work, monday);
    expect(out).toMatchObject({ workspaceId: "w1", block: null, sent: 1, failed: 0 });
    expect(s.invite).toHaveBeenCalledWith({ accountId: "acc1", providerId: "ACo1", note: "Hi Ana" });
    expect(r.sentCalls).toEqual([{ workspaceId: "w1", enrollmentId: "e1", kind: "invite", position: 0, chatId: null }]);
  });

  it("fills the placeholders from the lead", async () => {
    const s = sender();
    await runWorkspace(repo([invite()]), s, work, monday);
    expect(vi.mocked(s.invite).mock.calls[0][0].note).toBe("Hi Ana");
  });

  it("looks up and saves the Provider id once", async () => {
    const r = repo([invite({ providerId: null })]);
    const s = sender();
    await runWorkspace(r, s, work, monday);
    expect(s.providerId).toHaveBeenCalledWith({ accountId: "acc1", linkedinKey: "ana-costa" });
    expect(r.providers).toEqual([{ workspaceId: "w1", leadId: "l1", providerId: "ACo1" }]);
  });

  it("sends messages only for accepted invitations and keeps the chat id", async () => {
    const r = repo([invite({ enrollmentId: "m", position: 1, kind: "message", acceptedAt: "2026-11-20T00:00:00.000Z", chatId: null })]);
    const s = sender();
    const out = await runWorkspace(r, s, work, monday);
    expect(out.sent).toBe(1);
    expect(s.message).toHaveBeenCalledWith({ accountId: "acc1", providerId: "ACo1", text: "Hi Ana" });
    expect(r.sentCalls).toEqual([{ workspaceId: "w1", enrollmentId: "m", kind: "message", position: 1, chatId: "chat1" }]);
  });

  it("records a failure and keeps going with the next lead", async () => {
    const r = repo([invite({ enrollmentId: "bad" }), invite({ enrollmentId: "good" })]);
    const s = sender({ invite: vi.fn(async () => { throw new Error("Unipile invite failed (429)"); }) });
    const out = await runWorkspace(r, s, work, monday);
    expect(out).toMatchObject({ sent: 0, failed: 2 });
    expect(r.failedCalls).toEqual([
      { workspaceId: "w1", enrollmentId: "bad", error: "Unipile invite failed (429)" },
      { workspaceId: "w1", enrollmentId: "good", error: "Unipile invite failed (429)" },
    ]);
  });

  it("fails a step whose profile cannot be found instead of sending to nobody", async () => {
    const r = repo([invite({ providerId: null })]);
    const s = sender({ providerId: async () => null });
    const out = await runWorkspace(r, s, work, monday);
    expect(out.failed).toBe(1);
    expect(r.failedCalls).toEqual([{ workspaceId: "w1", enrollmentId: "e1", error: "profile not found" }]);
    expect(s.invite).not.toHaveBeenCalled();
  });

  it("does not call Unipile while sending is paused or outside the window", async () => {
    const s = sender();
    const paused = await runWorkspace(repo([invite()]), s, { ...work, paused: true }, monday);
    const late = await runWorkspace(repo([invite()]), s, work, new Date("2026-11-24T20:00:00.000Z"));
    expect(paused.block).toBe("paused");
    expect(late.block).toBe("outside_hours");
    expect(s.invite).not.toHaveBeenCalled();
  });
});
