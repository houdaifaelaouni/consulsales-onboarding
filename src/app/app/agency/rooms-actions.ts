"use server";

import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/auth/viewer";
import { openRoom, type OpenRoomResult } from "@/lib/agency/rooms";
import { createSupabaseRoomRepo } from "@/lib/agency/supabase-room-repo";
import { createClient } from "@/lib/supabase/server";

/** Any member of the agency may open a room. Membership is read through row-level security, then the service role does the writes. */
export async function openRoomAction(company: string, clientEmail: string): Promise<OpenRoomResult | { ok: false; reason: "forbidden" }> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, reason: "forbidden" };
  const supabase = await createClient();
  const { data: m } = await supabase.from("agency_member").select("agency_id").eq("user_id", viewer.id).limit(1);
  const agencyId = m?.[0]?.agency_id as string | undefined;
  if (!agencyId) return { ok: false, reason: "forbidden" };
  const r = await openRoom(createSupabaseRoomRepo(), { agencyId, openerId: viewer.id, company, clientEmail });
  if (r.ok || r.reason === "limit") revalidatePath("/app/agency");
  return r;
}
