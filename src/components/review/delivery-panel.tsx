"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { sendForReview } from "@/app/admin/clients/[id]/actions";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { Select } from "@/components/base/select/select";
import { TextArea } from "@/components/base/textarea/textarea";
import { t, tDynamic } from "@/lib/i18n";
import { canAddVersion, canSend, KINDS, nextVersionN, validateDraft, versionPayload } from "@/lib/review/authoring";
import type { Deliverable, DeliverableKind, Profile } from "@/lib/review/types";
import { createClient } from "@/lib/supabase/client";

const COLOR = { draft: "gray", in_review: "brand", changes_requested: "warning", approved: "success" } as const;
const EMPTY: Profile = { name: "", headline: "", about: "", banner: "" };

/** Lets the delivery team write deliverables and send them to the client. The database enforces who may do what. */
export function DeliveryPanel({ workspaceId, items, changeNotes }: { workspaceId: string; items: Deliverable[]; changeNotes: Record<string, string> }) {
  const router = useRouter();
  return (
    <section className="flex flex-col gap-4 rounded-xl bg-primary p-6 shadow-xs ring-1 ring-secondary">
      <h2 className="text-md font-semibold text-primary">{t("delivery.title")}</h2>
      {items.length === 0 && <p className="text-md text-tertiary">{t("delivery.empty")}</p>}
      <ul className="flex flex-col gap-4">
        {items.map((d) => <li key={d.id}><Item d={d} note={changeNotes[d.id]} onDone={() => router.refresh()} /></li>)}
      </ul>
      <Editor workspaceId={workspaceId} onDone={() => router.refresh()} />
    </section>
  );
}

function Item({ d, note, onDone }: { d: Deliverable; note?: string; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<"ok" | "err" | null>(null);
  async function send() {
    setBusy(true); setMsg(null);
    const res = await sendForReview(d.id);
    setBusy(false); setMsg(res.ok ? "ok" : "err"); if (res.ok) onDone();
  }
  return (
    <div className="flex flex-col gap-3 rounded-lg bg-secondary p-4 ring-1 ring-secondary">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-md font-medium text-primary">{d.title} <span className="text-sm text-tertiary">· v{d.versions.length}</span></p>
        <Badge size="sm" color={COLOR[d.status]}>{tDynamic(`review.status.${d.status}`, "en", d.status)}</Badge>
      </div>
      {note && d.status === "changes_requested" && <p className="text-sm text-secondary"><span className="font-medium">{t("delivery.clientNote")}</span> {note}</p>}
      {d.status === "approved" && <p className="text-sm text-tertiary">{t("delivery.locked")}</p>}
      {d.status === "in_review" && <p className="text-sm text-tertiary">{t("delivery.sentNote")}</p>}
      {canAddVersion(d.status) && <Editor workspaceId={null} deliverable={d} onDone={onDone} />}
      {canSend(d.status, d.versions.length) && <div><Button size="sm" isLoading={busy} onPress={send}>{t("delivery.send")}</Button></div>}
      {msg === "err" && <p role="alert" className="text-sm text-error-primary">{t("delivery.error")}</p>}
    </div>
  );
}

function Editor({ workspaceId, deliverable, onDone }: { workspaceId: string | null; deliverable?: Deliverable; onDone: () => void }) {
  const supabase = createClient();
  const [kind, setKind] = useState<DeliverableKind>(deliverable?.kind ?? "icp");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [profile, setProfile] = useState<Profile>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const creating = !deliverable;

  async function save() {
    setSaved(false);
    const draft = { kind, title, content, profile };
    const bad = validateDraft(draft, creating);
    if (bad) { setProblem(t(bad)); return; }
    setProblem(null); setBusy(true);
    let id = deliverable?.id;
    let ws = workspaceId;
    let n = nextVersionN(deliverable?.versions.map((v) => v.n) ?? []);
    if (creating) {
      const { data, error } = await supabase.from("deliverable").insert({ workspace_id: workspaceId, kind, title: title.trim() }).select("id").single();
      if (error || !data) { setBusy(false); setProblem(t("delivery.error")); return; }
      id = data.id; n = 1;
    } else {
      const { data } = await supabase.from("deliverable").select("workspace_id").eq("id", id!).single();
      ws = data?.workspace_id ?? null;
    }
    const { error } = await supabase.from("deliverable_version").insert({ deliverable_id: id, n, workspace_id: ws, ...versionPayload(draft) });
    setBusy(false);
    if (error) { setProblem(t("delivery.error")); return; }
    setTitle(""); setContent(""); setProfile(EMPTY); setSaved(true); onDone();
  }

  return (
    <div className="flex flex-col gap-3">
      {creating && <h3 className="text-sm font-semibold text-secondary">{t("delivery.new")}</h3>}
      {creating && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Select label={t("delivery.kind")} size="sm" items={KINDS.map((k) => ({ id: k, label: tDynamic(`review.kind.${k}`, "en", k) }))} selectedKey={kind} onSelectionChange={(k) => setKind(String(k) as DeliverableKind)}>
            {(item) => <Select.Item id={item.id} label={item.label} />}
          </Select>
          <Input label={t("delivery.name")} value={title} onChange={setTitle} />
        </div>
      )}
      {kind === "profile" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label={t("delivery.profileName")} value={profile.name} onChange={(v) => setProfile({ ...profile, name: v })} />
          <Input label={t("delivery.profileHeadline")} value={profile.headline} onChange={(v) => setProfile({ ...profile, headline: v })} />
          <Input label={t("delivery.profileBanner")} value={profile.banner} onChange={(v) => setProfile({ ...profile, banner: v })} />
          <div className="sm:col-span-2"><TextArea label={t("delivery.profileAbout")} rows={4} value={profile.about} onChange={(v) => setProfile({ ...profile, about: v })} /></div>
        </div>
      ) : (
        <TextArea label={t("delivery.content")} rows={5} value={content} onChange={setContent} />
      )}
      {problem && <p role="alert" className="text-sm text-error-primary">{problem}</p>}
      {saved && <p role="status" className="text-sm text-success-primary">{t("delivery.saved")}</p>}
      <div><Button size="sm" color="secondary" isLoading={busy} onPress={save}>{creating ? t("delivery.create") : t("delivery.addVersion")}</Button></div>
    </div>
  );
}
