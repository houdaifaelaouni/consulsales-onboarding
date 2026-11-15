import Link from "next/link";
import { buttonStyles, EmptyState } from "@/components/ui";
import { t, tDynamic } from "@/lib/i18n";

/** Placeholder until each task gets its own screen in later sprints. */
export default async function TaskStub({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-6 px-4 py-8">
      <EmptyState
        title={tDynamic(`task.${type}`, "en", t("task.stub.title"))}
        body={t("task.stub.body")}
        action={<Link href="/app" className={buttonStyles("secondary")}>{t("task.stub.back")}</Link>}
      />
    </main>
  );
}
