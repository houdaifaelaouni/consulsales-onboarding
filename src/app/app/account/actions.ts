"use server";

import { getViewer } from "@/lib/auth/viewer";
import { isWeakPin, pinProblem } from "@/lib/auth/pin";
import { createAdminClient } from "@/lib/supabase/admin";

export type PinResult = { ok: true } | { ok: false; reason: "forbidden" | "format" | "weak" | "failed" };

/** Sets or changes the signed-in person's PIN. It is hashed in the database and never read back. */
export async function setPin(pin: string): Promise<PinResult> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, reason: "forbidden" };
  const problem = pinProblem(pin);
  if (problem) return { ok: false, reason: isWeakPin(pin) && problem === "pin.err.weak" ? "weak" : "format" };
  try {
    const { error } = await createAdminClient().rpc("pin_set", { p_user: viewer.id, p_pin: pin });
    return error ? { ok: false, reason: "failed" } : { ok: true };
  } catch {
    return { ok: false, reason: "failed" };
  }
}

export async function removePin(): Promise<PinResult> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, reason: "forbidden" };
  try {
    const { error } = await createAdminClient().rpc("pin_clear", { p_user: viewer.id });
    return error ? { ok: false, reason: "failed" } : { ok: true };
  } catch {
    return { ok: false, reason: "failed" };
  }
}
