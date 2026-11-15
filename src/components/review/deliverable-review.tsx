"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge, Button, Card, Dialog, Select, Textarea } from "@/components/ui";
import { cn } from "@/lib/cn";
import { t } from "@/lib/i18n";
import { reanchor } from "@/lib/review/comments";
import { SAMPLE_CLIENT } from "@/lib/review/sample";
import { canApprove, canComment, isLocked } from "@/lib/review/status";
import { versionText } from "@/lib/review/preview";
import type { Anchor, Deliverable, DeliverableStatus, Role, Thread } from "@/lib/review/types";
import { CommentableText } from "./commentable-text";
import { DiffView } from "./diff-view";
import { PostPreview, ProfilePreview } from "./linkedin-preview";

type Tab = "review" | "versions" | "preview";
const fmt = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" });

export function DeliverableReview({ deliverable, role = "client_owner", backHref = "/demo/review" }: { deliverable: Deliverable; role?: Role; backHref?: string }) {
  const latest = deliverable.versions[deliverable.versions.length - 1];
  const [status, setStatus] = useState<DeliverableStatus>(deliverable.status);
  const [approved, setApproved] = useState(deliverable.approved);
  const [threads, setThreads] = useState<Thread[]>(deliverable.threads);
  const [versionN, setVersionN] = useState(latest.n);
  const [tab, setTab] = useState<Tab>("review");
  const [pending, setPending] = useState<Anchor | null>(null);
  const [draft, setDraft] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<"approve" | "changes" | null>(null);
  const [changeNote, setChangeNote] = useState("");
  const [changesSent, setChangesSent] = useState(false);

  const version = deliverable.versions.find((v) => v.n === versionN) ?? latest;
  const text = versionText(version);
  const locked = isLocked(status);
  const commentsOpen = canComment(status);
  const viewingLatest = version.n === latest.n;
  const approval = canApprove(status, role);

  // Each thread is shown on the version being viewed; if its quote moved we re-anchor, if it vanished it is "orphaned".
  const placed = useMemo(() => threads.map((th) => ({ th, anchor: th.versionN === version.n ? th.anchor : reanchor(text, th.anchor) })), [threads, version.n, text]);
  const anchors = placed.flatMap((p) => (p.anchor ? [{ id: p.th.id, anchor: p.anchor, resolved: p.th.resolved }] : []));

  function postComment() {
    if (!pending || !draft.trim()) return;
    const th: Thread = { id: `t${Date.now()}`, versionN: version.n, anchor: pending, author: SAMPLE_CLIENT.name, body: draft.trim(), at: new Date().toISOString(), resolved: false, replies: [] };
    setThreads((x) => [...x, th]);
    setPending(null); setDraft(""); setActiveId(th.id);
    document.getSelection()?.removeAllRanges();
  }
  const patchThread = (id: string, fn: (t: Thread) => Thread) => setThreads((x) => x.map((th) => (th.id === id ? fn(th) : th)));
  function pick(id: string) {
    setActiveId(id);
    document.getElementById(`thread-${id}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  const prev = deliverable.versions.length > 1 ? deliverable.versions[deliverable.versions.length - 2] : latest;

  return (
    <div className="space-y-6 pb-28">
      <div className="space-y-3">
        <Link href={backHref} className="inline-flex min-h-10 items-center text-sm text-ink-subtle hover:text-ink">← {t("review.back")}</Link>
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-[28px] leading-tight font-semibold tracking-[-0.6px]">{deliverable.title}</h1>
          <Badge tone={status === "approved" ? "success" : "neutral"} className="shrink-0">{t(`review.status.${status}` as "review.status.draft")}</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="sr-only" htmlFor="version-select">{t("review.version", "en", { n: "" })}</label>
          <Select id="version-select" value={versionN} onChange={(e) => setVersionN(Number(e.target.value))} className="w-auto!">
            {deliverable.versions.map((v) => (
              <option key={v.n} value={v.n}>{v.n === latest.n ? t("review.versionLatest", "en", { n: v.n }) : t("review.version", "en", { n: v.n })}</option>
            ))}
          </Select>
          <span className="text-sm text-ink-subtle">{version.createdBy} · {fmt(version.createdAt)}</span>
        </div>
      </div>

      <div role="tablist" aria-label={deliverable.title} className="grid grid-cols-3 gap-2">
        {(["review", "versions", "preview"] as const).map((k) => (
          <button key={k} role="tab" aria-selected={tab === k} id={`tab-${k}`} aria-controls={`panel-${k}`} onClick={() => setTab(k)}
            className={cn("min-h-10 rounded-md border px-2 text-sm transition-colors", tab === k ? "border-accent text-ink" : "border-hairline text-ink-subtle hover:bg-surface-1")}>
            {t(`review.tab.${k}` as "review.tab.review")}
          </button>
        ))}
      </div>

      {!viewingLatest && status === "in_review" && <p className="rounded-lg border border-hairline-strong bg-surface-1 px-4 py-3 text-sm text-ink-muted" role="status">{t("review.viewingOld")}</p>}

      {tab === "review" && (
        <section id="panel-review" role="tabpanel" aria-labelledby="tab-review" className="space-y-6">
          {locked && <p className="rounded-lg border border-hairline-strong bg-surface-1 px-4 py-3 text-sm text-ink-muted" role="status">{t("review.locked")}</p>}
          <CommentableText text={text} anchors={anchors} activeId={activeId} disabled={!commentsOpen} onSelect={setPending} onPick={pick} />

          {commentsOpen && (
            pending ? (
              <Card className="space-y-3">
                <p className="text-sm text-ink-subtle">{t("review.commentOnSelection")}: <q className="text-ink">{pending.quote.length > 80 ? `${pending.quote.slice(0, 80)}…` : pending.quote}</q></p>
                <Textarea aria-label={t("review.commentPlaceholder")} placeholder={t("review.commentPlaceholder")} value={draft} onChange={(e) => setDraft(e.target.value)} />
                <div className="flex gap-3">
                  <Button onClick={postComment} disabled={!draft.trim()}>{t("review.post")}</Button>
                  <Button variant="ghost" onClick={() => { setPending(null); setDraft(""); }}>{t("review.cancel")}</Button>
                </div>
              </Card>
            ) : <p className="text-sm text-ink-subtle">{t("review.commentHint")}</p>
          )}

          <div className="space-y-3">
            <h2 className="text-[13px] font-medium tracking-[0.4px] text-ink-subtle uppercase">{t("review.threads", "en", { n: threads.length })}</h2>
            {threads.length === 0 && <p className="text-ink-muted">{t("review.noComments")}</p>}
            {placed.map(({ th, anchor }) => (
              <ThreadCard key={th.id} th={th} orphaned={!anchor} active={activeId === th.id} locked={!commentsOpen}
                onActivate={() => setActiveId(th.id)}
                onResolve={() => patchThread(th.id, (x) => ({ ...x, resolved: !x.resolved }))}
                onReply={(body) => patchThread(th.id, (x) => ({ ...x, replies: [...x.replies, { id: `r${Date.now()}`, author: SAMPLE_CLIENT.name, body, at: new Date().toISOString() }] }))} />
            ))}
          </div>
        </section>
      )}

      {tab === "versions" && <VersionsPanel deliverable={deliverable} />}

      {tab === "preview" && (
        <section id="panel-preview" role="tabpanel" aria-labelledby="tab-preview" className="space-y-4">
          {deliverable.kind === "profile" && version.profile ? (
            <div className="grid gap-6 md:grid-cols-2">
              {prev.profile && prev.n !== version.n && <ProfilePreview profile={prev.profile} label={t("review.preview.old")} />}
              <ProfilePreview profile={version.profile} label={t("review.preview.new")} />
            </div>
          ) : deliverable.kind === "post" ? (
            <PostPreview author={SAMPLE_CLIENT.name} headline={SAMPLE_CLIENT.headline} text={version.content} />
          ) : <p className="text-ink-muted">{t("review.preview.none")}</p>}
        </section>
      )}

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-hairline bg-canvas/95 px-4 py-3 backdrop-blur lg:left-[280px]">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
          {status === "approved" && approved ? (
            <p className="text-sm text-ink-muted" role="status">{t("review.approvedBy", "en", { name: approved.by, date: fmt(approved.at) })}</p>
          ) : status === "changes_requested" || changesSent ? (
            <p className="text-sm text-ink-muted" role="status">{t("review.changesRequested")}</p>
          ) : (
            <>
              <Button variant="secondary" disabled={!approval.allowed || !viewingLatest} onClick={() => setDialog("changes")}>{t("review.requestChanges")}</Button>
              <Button disabled={!approval.allowed || !viewingLatest} onClick={() => setDialog("approve")}>{t("review.approve")}</Button>
            </>
          )}
        </div>
      </div>

      <Dialog open={dialog === "approve"} onClose={() => setDialog(null)} title={t("review.approveTitle")}>
        <p className="mb-5 text-ink-muted">{t("review.approveBody", "en", { unlock: deliverable.unlocks ?? "" })}</p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setDialog(null)}>{t("review.cancel")}</Button>
          <Button onClick={() => { setStatus("approved"); setApproved({ by: SAMPLE_CLIENT.name, at: new Date().toISOString(), versionN: version.n }); setDialog(null); }}>{t("review.confirmApprove")}</Button>
        </div>
      </Dialog>
      <Dialog open={dialog === "changes"} onClose={() => setDialog(null)} title={t("review.changesTitle")}>
        <Textarea aria-label={t("review.changesTitle")} placeholder={t("review.changesPlaceholder")} value={changeNote} onChange={(e) => setChangeNote(e.target.value)} />
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setDialog(null)}>{t("review.cancel")}</Button>
          <Button disabled={!changeNote.trim()} onClick={() => { setStatus("changes_requested"); setChangesSent(true); setDialog(null); }}>{t("review.sendChanges")}</Button>
        </div>
      </Dialog>
    </div>
  );
}

function VersionsPanel({ deliverable }: { deliverable: Deliverable }) {
  const vs = deliverable.versions;
  const [from, setFrom] = useState(vs.length > 1 ? vs[vs.length - 2].n : vs[0].n);
  const [to, setTo] = useState(vs[vs.length - 1].n);
  const a = vs.find((v) => v.n === from) ?? vs[0];
  const b = vs.find((v) => v.n === to) ?? vs[vs.length - 1];
  return (
    <section id="panel-versions" role="tabpanel" aria-labelledby="tab-versions" className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm text-ink-subtle" htmlFor="diff-from">{t("review.diff.from")}</label>
        <Select id="diff-from" className="w-auto!" value={from} onChange={(e) => setFrom(Number(e.target.value))}>{vs.map((v) => <option key={v.n} value={v.n}>{t("review.version", "en", { n: v.n })}</option>)}</Select>
        <label className="text-sm text-ink-subtle" htmlFor="diff-to">{t("review.diff.to")}</label>
        <Select id="diff-to" className="w-auto!" value={to} onChange={(e) => setTo(Number(e.target.value))}>{vs.map((v) => <option key={v.n} value={v.n}>{t("review.version", "en", { n: v.n })}</option>)}</Select>
      </div>
      <DiffView from={versionText(a)} to={versionText(b)} />
    </section>
  );
}

function ThreadCard({ th, orphaned, active, locked, onActivate, onResolve, onReply }: {
  th: Thread; orphaned: boolean; active: boolean; locked: boolean; onActivate: () => void; onResolve: () => void; onReply: (body: string) => void;
}) {
  const [reply, setReply] = useState("");
  return (
    <Card id={`thread-${th.id}`} className={cn("space-y-3 p-4", th.resolved && "opacity-70", active && "border-accent")} onClick={onActivate}>
      <p className="border-l-2 border-hairline-strong pl-3 text-sm text-ink-subtle">“{th.anchor.quote}”</p>
      {orphaned && <p className="text-sm text-ink">{t("review.orphaned")}</p>}
      <div><p className="text-sm font-medium">{th.author}</p><p className="text-ink-muted">{th.body}</p></div>
      {th.replies.map((r) => (
        <div key={r.id} className="border-l-2 border-hairline pl-3"><p className="text-sm font-medium">{r.author}</p><p className="text-ink-muted">{r.body}</p></div>
      ))}
      {!locked && !th.resolved && (
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (reply.trim()) { onReply(reply.trim()); setReply(""); } }}>
          <input aria-label={t("review.replyPlaceholder")} placeholder={t("review.replyPlaceholder")} value={reply} onChange={(e) => setReply(e.target.value)}
            className="min-h-10 min-w-0 flex-1 rounded-md border border-hairline bg-surface-2 px-3 text-sm text-ink placeholder:text-ink-subtle" />
          <Button type="submit" variant="secondary" disabled={!reply.trim()}>{t("review.reply")}</Button>
        </form>
      )}
      {!locked && <Button variant="ghost" onClick={onResolve}>{th.resolved ? t("review.reopen") : t("review.resolve")}</Button>}
      {th.resolved && <Badge>{t("review.resolved")}</Badge>}
    </Card>
  );
}
