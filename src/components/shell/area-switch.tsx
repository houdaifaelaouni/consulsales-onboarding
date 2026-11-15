import { ArrowRight } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { t } from "@/lib/i18n";

/** Lets staff hop between the two sides. Clients never get this link. */
export function AreaSwitch({ to }: { to: "admin" | "client" }) {
  return (
    <Button color="secondary" size="sm" href={to === "admin" ? "/admin" : "/app"} iconTrailing={ArrowRight}>
      {t(to === "admin" ? "area.switchToAdmin" : "area.switchToClient")}
    </Button>
  );
}
