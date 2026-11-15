"use client";

import { AlertCircle, Clock, File05 } from "@untitledui/icons";
import { EmptyState } from "@/components/application/empty-state/empty-state";
import { Button } from "@/components/base/buttons/button";

const ICONS = { error: AlertCircle, waiting: Clock, documents: File05 } as const;

/**
 * A full-page empty or error state. Server pages pass an icon *name*, never the icon itself:
 * a component function cannot cross from a server page into a client component.
 */
export function Notice({ icon, title, body, retryHref, retryLabel }: {
  icon: keyof typeof ICONS; title: string; body: string; retryHref?: string; retryLabel?: string;
}) {
  const Icon = ICONS[icon];
  return (
    <main className="mx-auto flex max-w-7xl px-4 py-16 lg:px-8">
      <EmptyState className="mx-auto">
        <EmptyState.Header><EmptyState.FeaturedIcon icon={Icon} color={icon === "error" ? "error" : "gray"} /></EmptyState.Header>
        <EmptyState.Content>
          <EmptyState.Title>{title}</EmptyState.Title>
          <EmptyState.Description>{body}</EmptyState.Description>
        </EmptyState.Content>
        {retryHref && retryLabel && <EmptyState.Footer><Button color="secondary" href={retryHref}>{retryLabel}</Button></EmptyState.Footer>}
      </EmptyState>
    </main>
  );
}
