import Link from "next/link";
import { Card } from "@/components/ui";

const SCREENS = [
  { href: "/demo/intake", title: "Guided intake", note: "Four steps, autosave, resume, not-sure answers" },
  { href: "/demo/access", title: "Access and assets", note: "CRM connect, secure credentials, booking link, brand files" },
  { href: "/demo/review", title: "Review and approve", note: "Inline comments, version diff, LinkedIn preview, approval" },
  { href: "/demo/payments", title: "Stage payments", note: "Invoices that appear only after approval, due dates, reminders" },
];

export default function DemoIndex() {
  return (
    <main className="mx-auto max-w-xl space-y-6 px-4 py-10">
      <h1 className="text-[28px] font-semibold tracking-[-0.6px]">Screens</h1>
      <ul className="space-y-3">
        {SCREENS.map((s) => (
          <li key={s.href}>
            <Link href={s.href}>
              <Card className="transition-colors hover:bg-surface-2">
                <h2 className="text-[22px] font-medium tracking-[-0.4px]">{s.title}</h2>
                <p className="text-ink-muted">{s.note}</p>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
