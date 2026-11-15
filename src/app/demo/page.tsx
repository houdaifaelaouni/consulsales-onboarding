import Link from "next/link";
import { Card } from "@/components/ui";

const SCREENS = [
  { href: "/demo/intake", title: "Guided intake", note: "Four steps, autosave, resume, not-sure answers" },
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
