"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, CheckCircle, Lock01 } from "@untitledui/icons";
import { Heading as AriaHeading } from "react-aria-components";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { Tabs } from "@/components/application/tabs/tabs";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { Select } from "@/components/base/select/select";
import { TextArea } from "@/components/base/textarea/textarea";
import { t } from "@/lib/i18n";
import { reanchor } from "@/lib/review/comments";
import { versionText } from "@/lib/review/preview";
import { SAMPLE_CLIENT } from "@/lib/review/sample";
import { canApprove, canComment, isLocked } from "@/lib/review/status";
import type { Anchor, Deliverable, DeliverableStatus, Role, Thread } from "@/lib/review/types";
import { cx } from "@/utils/cx";
import { CommentableText } from "./commentable-text";
import { DiffView } from "./diff-view";
import { PostPreview, ProfilePreview } from "./linkedin-preview";

type Tab = "review" | "versions" | "preview";
const STATUS_COLOR = { draft: "gray", in_review: "brand", changes_requested: "warning", approved: "success" } as const;
const fmt = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" });

export type Decide = (decision: "approve" | "request_changes", note?: string) => Promise<boolean>;

export function DeliverableReview({ deliverable, role = "client_owner", backHref = "/demo/review", onDecide }: { deliverable: Deliverable; role?: Role; backHref?: string; onDecide?: Decide }) {
  const [decideError, setDecideError] = useState(false);
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
  const versionItems = deliverable.versions.map((v) => ({ id: String(v.n), label: v.n === latest.n ? t("review.versionLatest", "en", { n: v.n }) : t("review.version", "en", { n: v.n }) }));

  return (
    <div className="flex flex-col gap-6 pb-28">
      <div className="flex flex-col gap-3">
        <div><Button href={backHref} color="link-gray" size="sm" iconLeading={ArrowLeft}>{t("review.back")}</Button></div>
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-display-sm font-semibold text-primary">{deliverable.title}</h1>
          <Badge size="md" color={STATUS_COLOR[status]} className="shrink-0">{t(`review.status.${status}` as "review.status.draft")}</Badge>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <Select size="sm" aria-label={t("review.version", "en", { n: "" })} className="w-52" items={versionItems} selectedKey={String(versionN)} onSelectionChange={(k) => setVersionN(Number(k))}>
            {(item) => <Select.Item id={item.id} label={item.label} />}
          </Select>
          <span className="pb-2 text-sm text-tertiary">{version.createdBy} · {fmt(version.createdAt)}</span>
        </div>
      </div>

      <Tabs selectedKey={tab} onSelectionChange={(k) => setTab(String(k) as Tab)}>
        <Tabs.List type="button-border" size="sm" className="w-full" items={(["review", "versions", "preview"] as const).map((k) => ({ id: k, label: t(`review.tab.${k}` as "review.tab.review") }))}>
          {(item) => <Tabs.Item {...item} />}
        </Tabs.List>

        {!viewingLatest && status === "in_review" && <p className="mt-4 rounded-lg bg-secondary p-3 text-sm text-secondary ring-1 ring-secondary" role="status">{t("review.viewingOld")}</p>}

        <Tabs.Panel id="review" className="flex flex-col gap-6 pt-6">
          {locked && (
            <p className="flex items-center gap-2 rounded-lg bg-secondary p-3 text-sm text-secondary ring-1 ring-secondary" role="status"><Lock01 aria-hidden className="size-4 text-fg-quaternary" />{t("review.locked")}</p>
          )}
          <CommentableText text={text} anchors={anchors} activeId={activeId} disabled={!commentsOpen} onSelect={setPending} onPick={pick} />

          {commentsOpen && (
            pending ? (
              <div className="flex flex-col gap-3 rounded-xl bg-primary p-4 shadow-xs ring-1 ring-secondary">
                <p className="text-sm text-tertiary">{t("review.commentOnSelection")}: <q className="text-primary">{pending.quote.length > 80 ? `${pending.quote.slice(0, 80)}…` : pending.quote}</q></p>
                <TextArea aria-label={t("review.commentPlaceholder")} placeholder={t("review.commentPlaceholder")} value={draft} onChange={setDraft} rows={3} />
                <div className="flex gap-3">
                  <Button onPress={postComment} isDisabled={!draft.trim()}>{t("review.post")}</Button>
                  <Button color="tertiary" onPress={() => { setPending(null); setDraft(""); }}>{t("review.cancel")}</Button>
                </div>
              </div>
            ) : <p className="text-sm text-tertiary">{t("review.commentHint")}</p>
          )}

          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-secondary">{t("review.threads", "en", { n: threads.length })}</h2>
            {threads.length === 0 && <p className="text-md text-tertiary">{t("review.noComments")}</p>}
            {placed.map(({ th, anchor }) => (
              <ThreadCard key={th.id} th={th} orphaned={!anchor} active={activeId === th.id} locked={!commentsOpen}
                onActivate={() => setActiveId(th.id)}
                onResolve={() => patchThread(th.id, (x) => ({ ...x, resolved: !x.resolved }))}
                onReply={(body) => patchThread(th.id, (x) => ({ ...x, replies: [...x.replies, { id: `r${Date.now()}`, author: SAMPLE_CLIENT.name, body, at: new Date().toISOString() }] }))} />
            ))}
          </div>
        </Tabs.Panel>

        <Tabs.Panel id="versions" className="pt-6"><VersionsPanel deliverable={deliverable} /></Tabs.Panel>

        <Tabs.Panel id="preview" className="flex flex-col gap-4 pt-6">
          {deliverable.kind === "profile" && version.profile ? (
            <div className="grid gap-6 md:grid-cols-2">
              {prev.profile && prev.n !== version.n && <ProfilePreview profile={prev.profile} label={t("review.preview.old")} />}
              <ProfilePreview profile={version.profile} label={t("review.preview.new")} />
            </div>
          ) : deliverable.kind === "post" ? (
            <PostPreview author={SAMPLE_CLIENT.name} headline={SAMPLE_CLIENT.headline} text={version.content} />
          ) : <p className="text-md text-tertiary">{t("review.preview.none")}</p>}
        </Tabs.Panel>
      </Tabs>

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-secondary bg-primary/95 px-4 py-3 backdrop-blur lg:left-[280px]">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
          {status === "approved" && approved ? (
            <p className="flex items-center gap-2 text-sm text-secondary" role="status"><CheckCircle aria-hidden className="size-5 shrink-0 text-fg-success-primary" />{t("review.approvedBy", "en", { name: approved.by, date: fmt(approved.at) })}</p>
          ) : status === "changes_requested" || changesSent ? (
            <p className="text-sm text-secondary" role="status">{t("review.changesRequested")}</p>
          ) : (
            <>
              <Button color="secondary" isDisabled={!approval.allowed || !viewingLatest} onPress={() => setDialog("changes")}>{t("review.requestChanges")}</Button>
              <Button isDisabled={!approval.allowed || !viewingLatest} onPress={() => setDialog("approve")}>{t("review.approve")}</Button>
            </>
          )}
        </div>
      </div>

      <ModalOverlay isOpen={dialog === "approve"} onOpenChange={(o) => { if (!o) setDialog(null); }} isDismissable>
        <Modal className="max-w-md">
          <Dialog>
            <div className="flex flex-col gap-4 p-6">
              <AriaHeading slot="title" className="text-lg font-semibold text-primary">{t("review.approveTitle")}</AriaHeading>
              <p className="text-md text-tertiary">{t("review.approveBody", "en", { unlock: deliverable.unlocks ?? "" })}</p>
              <div className="flex justify-end gap-3">
                <Button color="tertiary" onPress={() => setDialog(null)}>{t("review.cancel")}</Button>
                {decideError && <p role="alert" className="text-sm text-error-primary">{t("review.decideError")}</p>}
                <Button onPress={async () => { setDecideError(false); if (onDecide && !(await onDecide("approve"))) { setDecideError(true); return; } setStatus("approved"); setApproved({ by: SAMPLE_CLIENT.name, at: new Date().toISOString(), versionN: version.n }); setDialog(null); }}>{t("review.confirmApprove")}</Button>
              </div>
            </div>
          </Dialog>
        </Modal>
      </ModalOverlay>

      <ModalOverlay isOpen={dialog === "changes"} onOpenChange={(o) => { if (!o) setDialog(null); }} isDismissable>
        <Modal className="max-w-md">
          <Dialog>
            <div className="flex flex-col gap-4 p-6">
              <AriaHeading slot="title" className="text-lg font-semibold text-primary">{t("review.changesTitle")}</AriaHeading>
              <TextArea aria-label={t("review.changesTitle")} placeholder={t("review.changesPlaceholder")} value={changeNote} onChange={setChangeNote} rows={4} />
              <div className="flex justify-end gap-3">
                <Button color="tertiary" onPress={() => setDialog(null)}>{t("review.cancel")}</Button>
                {decideError && <p role="alert" className="text-sm text-error-primary">{t("review.decideError")}</p>}
                <Button isDisabled={!changeNote.trim()} onPress={async () => { setDecideError(false); if (onDecide && !(await onDecide("request_changes", changeNote.trim()))) { setDecideError(true); return; } setStatus("changes_requested"); setChangesSent(true); setDialog(null); }}>{t("review.sendChanges")}</Button>
              </div>
            </div>
          </Dialog>
        </Modal>
      </ModalOverlay>
    </div>
  );
}

function VersionsPanel({ deliverable }: { deliverable: Deliverable }) {
  const vs = deliverable.versions;
  const [from, setFrom] = useState(vs.length > 1 ? vs[vs.length - 2].n : vs[0].n);
  const [to, setTo] = useState(vs[vs.length - 1].n);
  const a = vs.find((v) => v.n === from) ?? vs[0];
  const b = vs.find((v) => v.n === to) ?? vs[vs.length - 1];
  const items = vs.map((v) => ({ id: String(v.n), label: t("review.version", "en", { n: v.n }) }));
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <Select size="sm" label={t("review.diff.from")} className="w-40" items={items} selectedKey={String(from)} onSelectionChange={(k) => setFrom(Number(k))}>{(item) => <Select.Item id={item.id} label={item.label} />}</Select>
        <Select size="sm" label={t("review.diff.to")} className="w-40" items={items} selectedKey={String(to)} onSelectionChange={(k) => setTo(Number(k))}>{(item) => <Select.Item id={item.id} label={item.label} />}</Select>
      </div>
      <DiffView from={versionText(a)} to={versionText(b)} />
    </div>
  );
}

function ThreadCard({ th, orphaned, active, locked, onActivate, onResolve, onReply }: {
  th: Thread; orphaned: boolean; active: boolean; locked: boolean; onActivate: () => void; onResolve: () => void; onReply: (body: string) => void;
}) {
  const [reply, setReply] = useState("");
  return (
    <div
      id={`thread-${th.id}`} onClick={onActivate}
      className={cx("flex flex-col gap-3 rounded-xl bg-primary p-4 shadow-xs ring-1", th.resolved && "opacity-70", active ? "ring-brand" : "ring-secondary")}
    >
      <p className="border-l-2 border-secondary pl-3 text-sm text-quaternary">“{th.anchor.quote}”</p>
      {orphaned && <p className="text-sm text-secondary">{t("review.orphaned")}</p>}
      <div><p className="text-sm font-medium text-primary">{th.author}</p><p className="text-tertiary">{th.body}</p></div>
      {th.replies.map((r) => (
        <div key={r.id} className="border-l-2 border-secondary pl-3"><p className="text-sm font-medium text-primary">{r.author}</p><p className="text-tertiary">{r.body}</p></div>
      ))}
      {!locked && !th.resolved && (
        <form className="flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); if (reply.trim()) { onReply(reply.trim()); setReply(""); } }}>
          <Input size="sm" className="min-w-0 flex-1" aria-label={t("review.replyPlaceholder")} placeholder={t("review.replyPlaceholder")} value={reply} onChange={setReply} />
          <Button type="submit" color="secondary" size="sm" isDisabled={!reply.trim()}>{t("review.reply")}</Button>
        </form>
      )}
      <div className="flex items-center gap-2">
        {!locked && <Button color="tertiary" size="sm" onPress={onResolve}>{th.resolved ? t("review.reopen") : t("review.resolve")}</Button>}
        {th.resolved && <Badge size="sm" color="gray">{t("review.resolved")}</Badge>}
      </div>
    </div>
  );
}
