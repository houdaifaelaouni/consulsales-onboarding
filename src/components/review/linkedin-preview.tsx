"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { t } from "@/lib/i18n";
import { truncateForPreview } from "@/lib/review/preview";
import type { Profile } from "@/lib/review/types";

/** Neutral, LinkedIn-style card. It is a preview of layout and truncation, not LinkedIn's own artwork. */
function SeeMore({ text, className }: { text: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const { visible, truncated } = truncateForPreview(text);
  return (
    <div className={cn("whitespace-pre-wrap", className)}>
      {open || !truncated ? text : visible}
      {truncated && (
        <button type="button" className="ml-1 text-ink-subtle hover:text-ink" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          {open ? t("review.seeLess") : t("review.seeMore")}
        </button>
      )}
    </div>
  );
}

function Avatar({ name }: { name: string }) {
  const initials = name.split(" ").map((p) => p[0]).slice(0, 2).join("");
  return <span aria-hidden className="grid size-14 shrink-0 place-items-center rounded-full border border-hairline-strong bg-surface-3 text-lg font-medium">{initials}</span>;
}

export function ProfilePreview({ profile, label }: { profile: Profile; label: string }) {
  return (
    <figure className="space-y-2">
      <figcaption className="text-[13px] font-medium tracking-[0.4px] text-ink-subtle uppercase">{label}</figcaption>
      <div className="overflow-hidden rounded-lg border border-hairline bg-surface-1">
        <div className="grid h-20 place-items-center bg-surface-3 px-3 text-center text-sm text-ink-muted">{profile.banner}</div>
        <div className="space-y-3 p-4">
          <div className="-mt-12 w-fit rounded-full border-2 border-surface-1"><Avatar name={profile.name} /></div>
          <div>
            <p className="text-lg font-semibold">{profile.name}</p>
            <p className="text-ink-muted">{profile.headline}</p>
          </div>
          <div className="space-y-1 border-t border-hairline pt-3">
            <p className="text-sm font-medium">About</p>
            <SeeMore text={profile.about} className="text-sm text-ink-muted" />
          </div>
        </div>
      </div>
    </figure>
  );
}

export function PostPreview({ author, headline, text }: { author: string; headline: string; text: string }) {
  return (
    <figure className="space-y-2">
      <div className="space-y-3 rounded-lg border border-hairline bg-surface-1 p-4">
        <div className="flex items-center gap-3">
          <Avatar name={author} />
          <div className="min-w-0"><p className="font-semibold">{author}</p><p className="truncate text-sm text-ink-subtle">{headline}</p></div>
        </div>
        <SeeMore text={text} className="text-ink-muted" />
      </div>
    </figure>
  );
}
