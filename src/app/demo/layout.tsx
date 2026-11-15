import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Demo", robots: { index: false, follow: false } };

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <div className="border-b border-hairline bg-surface-1 px-4 py-2 text-center text-[13px] text-ink-subtle">
        Demo with sample data. Nothing is saved to a server. <Link href="/demo" className="text-ink underline underline-offset-2">All screens</Link>
      </div>
      {children}
    </div>
  );
}
