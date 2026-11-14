import { t } from "@/lib/i18n";

export default function AppHome() {
  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-[28px] font-semibold tracking-[-0.6px]">{t("app.welcome")}</h1>
    </main>
  );
}
