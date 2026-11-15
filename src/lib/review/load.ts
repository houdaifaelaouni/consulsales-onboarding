import { createClient } from "@/lib/supabase/server";
import { toDeliverables } from "./from-db";
import type { Deliverable } from "./types";

/** Loads deliverables through the viewer's session; RLS limits them to their own workspace. */
export async function loadDeliverables(onlyId?: string): Promise<Deliverable[]> {
  const supabase = await createClient();
  let q = supabase.from("deliverable").select("id,kind,title,status,unlocks,approved_by,approved_at,approved_version").order("created_at");
  if (onlyId) q = q.eq("id", onlyId);
  const { data: rows, error } = await q;
  if (error) throw new Error("load failed");
  const ids = (rows ?? []).map((r) => r.id);
  if (ids.length === 0) return [];
  const { data: versions, error: vErr } = await supabase.from("deliverable_version").select("deliverable_id,n,content,profile,created_by,created_at").in("deliverable_id", ids);
  if (vErr) throw new Error("load failed");
  const personIds = [...new Set([...(rows ?? []).map((r) => r.approved_by), ...(versions ?? []).map((v) => v.created_by)].filter(Boolean))] as string[];
  // app_user is readable only for yourself or by an admin, so other names fall back to a generic label.
  const people = new Map<string, string>();
  if (personIds.length) {
    const { data } = await supabase.from("app_user").select("id,name").in("id", personIds);
    for (const p of data ?? []) if (p.name) people.set(p.id, p.name);
  }
  return toDeliverables(rows ?? [], versions ?? [], people);
}
