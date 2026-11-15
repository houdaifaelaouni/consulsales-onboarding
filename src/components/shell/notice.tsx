"use client";

import { EmptyState } from "@/components/application/empty-state/empty-state";
import { Art } from "@/components/illustrations/art";
import { Button } from "@/components/base/buttons/button";

type IconName = "error" | "waiting" | "documents";

/**
 * A full-page empty or error state. Server pages pass an icon *name*, never the icon itself:
 * a component function cannot cross from a server page into a client component.
 */
export function Notice({ icon, title, body, retryHref, retryLabel }: {
  icon: IconName; title: string; body: string; retryHref?: string; retryLabel?: string;
}) {
  return (
    <main className="mx-auto flex max-w-7xl px-4 py-16 lg:px-8">
      <EmptyState className="mx-auto">
        <EmptyState.Header><Art kind={icon === "error" ? "error" : "waiting"} /></EmptyState.Header>
        <EmptyState.Content>
          <EmptyState.Title>{title}</EmptyState.Title>
          <EmptyState.Description>{body}</EmptyState.Description>
        </EmptyState.Content>
        {retryHref && retryLabel && <EmptyState.Footer><Button color="secondary" href={retryHref}>{retryLabel}</Button></EmptyState.Footer>}
      </EmptyState>
    </main>
  );
}
