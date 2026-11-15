import { createAdminClient } from "@/lib/supabase/admin";

export type PinStatus = "on" | "off" | "unavailable";

/** Server-only. The PIN table is closed to the browser, so ask through the server key. "unavailable" when that key is missing. */
export async function pinStatus(userId: string): Promise<PinStatus> {
  try {
    const { data, error } = await createAdminClient().rpc("pin_exists", { p_user: userId });
    if (error) return "unavailable";
    return data === true ? "on" : "off";
  } catch {
    return "unavailable";
  }
}
