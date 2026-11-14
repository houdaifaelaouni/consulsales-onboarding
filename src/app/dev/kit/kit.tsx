"use client";

import { useState } from "react";
import { Badge, Button, Card, Dialog, EmptyState, Input, Select, Skeleton, Table, Td, Textarea, Th, Toast } from "@/components/ui";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-[13px] font-medium tracking-[0.4px] text-ink-subtle uppercase">{title}</h2>
      {children}
    </section>
  );
}

export function Kit() {
  const [open, setOpen] = useState(false);
  return (
    <main className="mx-auto max-w-3xl space-y-10 px-4 py-12">
      <h1 className="text-[28px] font-semibold tracking-[-0.6px]">UI kit</h1>

      <Section title="Button">
        <div className="flex flex-wrap gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button disabled>Disabled</Button>
        </div>
      </Section>

      <Section title="Fields">
        <div className="grid gap-3 sm:grid-cols-2">
          <Input placeholder="Input" aria-label="Input" />
          <Input placeholder="Disabled" aria-label="Disabled input" disabled />
          <Input placeholder="Invalid" aria-label="Invalid input" aria-invalid="true" />
          <Select aria-label="Select"><option>Starter</option><option>Pro</option><option>Enterprise</option></Select>
          <Textarea className="sm:col-span-2" placeholder="Textarea" aria-label="Textarea" />
        </div>
      </Section>

      <Section title="Card and badge">
        <Card className="space-y-2">
          <div className="flex items-center gap-2"><h3 className="text-[22px] font-medium tracking-[-0.4px]">Studio North</h3><Badge>Intake</Badge><Badge tone="success">Live</Badge></div>
          <p className="text-ink-muted">Growth plan, day 2 of 30.</p>
        </Card>
      </Section>

      <Section title="Table">
        <Table>
          <thead><tr><Th>Client</Th><Th>Plan</Th><Th>Stage</Th></tr></thead>
          <tbody>
            <tr><Td>Studio North</Td><Td>Growth</Td><Td><Badge>Intake</Badge></Td></tr>
            <tr><Td>Kite Labs</Td><Td>Scale</Td><Td><Badge>Building</Badge></Td></tr>
          </tbody>
        </Table>
      </Section>

      <Section title="Dialog and toast">
        <Button variant="secondary" onClick={() => setOpen(true)}>Open dialog</Button>
        <Dialog open={open} onClose={() => setOpen(false)} title="Approve this deliverable?">
          <p className="mb-5 text-ink-muted">Approving locks this version and unlocks the next stage.</p>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => setOpen(false)}>Approve</Button>
          </div>
        </Dialog>
        <Toast tone="success">Saved</Toast>
      </Section>

      <Section title="Empty and loading">
        <EmptyState title="Nothing here yet" body="Your checklist will appear once your workspace is ready." action={<Button>Get started</Button>} />
        <div className="space-y-2"><Skeleton className="h-6 w-1/2" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-3/4" /></div>
      </Section>
    </main>
  );
}
