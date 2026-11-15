"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { RefreshCw01 } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { t } from "@/lib/i18n";

/** Re-reads the server's status after the person adds a key and redeploys. */
export function RecheckButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return <Button color="secondary" iconLeading={RefreshCw01} isLoading={pending} onPress={() => start(() => router.refresh())}>{t("integrations.recheck")}</Button>;
}
