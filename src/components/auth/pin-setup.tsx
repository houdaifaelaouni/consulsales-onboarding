"use client";

import { useState } from "react";
import { removePin, setPin } from "@/app/app/account/actions";
import { PinPad } from "@/components/auth/pin-pad";
import { Button } from "@/components/base/buttons/button";
import { pinProblem, PIN_LENGTH } from "@/lib/auth/pin";
import { t, type MessageKey } from "@/lib/i18n";

type Step = "idle" | "enter" | "confirm" | "saving" | "done";

/** Set, change or remove the PIN. Entered twice so a slip of the finger does not lock the person out. */
export function PinSetup({ hasPin: initial, canSave }: { hasPin: boolean; canSave: boolean }) {
  const [hasPin, setHasPin] = useState(initial);
  const [step, setStep] = useState<Step>("idle");
  const [first, setFirst] = useState("");
  const [value, setValue] = useState("");
  const [msg, setMsg] = useState<MessageKey | null>(null);

  const reset = () => { setStep("idle"); setFirst(""); setValue(""); };

  function onEntered(pin: string) {
    setMsg(null);
    if (step === "enter") {
      const p = pinProblem(pin);
      if (p) { setMsg(p); setValue(""); return; }
      setFirst(pin); setValue(""); setStep("confirm");
      return;
    }
    if (pin !== first) { setMsg("pin.err.mismatch"); setFirst(""); setValue(""); setStep("enter"); return; }
    setStep("saving");
    void setPin(pin).then((r) => {
      if (r.ok) { setHasPin(true); setStep("done"); setValue(""); return; }
      setMsg(r.reason === "weak" ? "pin.err.weak" : "pin.err.save"); setValue(""); setStep("enter");
    });
  }

  async function remove() {
    const r = await removePin();
    if (r.ok) { setHasPin(false); reset(); } else setMsg("pin.err.save");
  }

  if (!canSave) return <p className="text-sm text-tertiary">{t("pin.notReady")}</p>;

  if (step === "idle" || step === "done") {
    return (
      <div className="flex flex-col gap-3">
        {step === "done" && <p role="status" className="text-sm text-success-primary">{t("pin.saved")}</p>}
        <p className="text-sm text-secondary">{hasPin ? t("pin.on") : t("pin.off")}</p>
        {msg && <p role="alert" className="text-sm text-error-primary">{t(msg)}</p>}
        <div className="flex flex-wrap gap-3">
          <Button size="sm" onPress={() => { setMsg(null); setStep("enter"); }}>{hasPin ? t("pin.change") : t("pin.set")}</Button>
          {hasPin && <Button size="sm" color="secondary" onPress={remove}>{t("pin.remove")}</Button>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-md font-medium text-primary" aria-live="polite">{step === "confirm" ? t("pin.confirm") : t("pin.enter", "en", { n: PIN_LENGTH })}</p>
      <PinPad key={step} value={value} onChange={setValue} onComplete={onEntered} disabled={step === "saving"} isInvalid={!!msg} label={t("pin.label")} />
      <p role="alert" className="min-h-5 text-sm text-error-primary">{msg ? t(msg) : ""}</p>
      <Button size="sm" color="tertiary" onPress={reset}>{t("pin.cancel")}</Button>
    </div>
  );
}
