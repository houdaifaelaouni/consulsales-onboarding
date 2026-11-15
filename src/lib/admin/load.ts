import { createClient } from "@/lib/supabase/server";
import { oldestBlock } from "@/lib/access/rows";
import { toAdminClients } from "./from-db";
import type { AdminClient } from "./types";

/** Loads clients through the viewer's own session, so RLS decides which ones an admin or delivery lead sees. */
export async function loadAdminClients(onlyId?: string): Promise<AdminClient[]> {
  const supabase = await createClient();
  let wq = supabase.from("workspace").select("id,company,plan,stage,start_date").order("created_at", { ascending: false });
  if (onlyId) wq = wq.eq("id", onlyId);
  const { data: workspaces, error } = await wq;
  if (error) throw new Error("load failed");
  const ids = (workspaces ?? []).map((w) => w.id);
  if (ids.length === 0) return [];
  const [tasks, members, events, access, invoices] = await Promise.all([
    supabase.from("task").select("id,workspace_id,type,status,due_at").in("workspace_id", ids),
    supabase.from("membership").select("workspace_id,user_id,role").in("workspace_id", ids),
    supabase.from("event_log").select("workspace_id,actor,action,at").in("workspace_id", ids).order("at", { ascending: false }).limit(500),
    supabase.from("access_item").select("workspace_id,status,blocked_since").in("workspace_id", ids),
    supabase.from("invoice").select("workspace_id,stage,amount_cents,created_at,paid_at").in("workspace_id", ids),
  ]);
  if (tasks.error || members.error || events.error || access.error || invoices.error) throw new Error("load failed");
  const personIds = [...new Set([...(members.data ?? []).map((m) => m.user_id), ...(events.data ?? []).map((e) => e.actor).filter(Boolean)])] as string[];
  const people = personIds.length ? (await supabase.from("app_user").select("id,name,email").in("id", personIds)).data ?? [] : [];
  return toAdminClients(workspaces ?? [], tasks.data ?? [], members.data ?? [], events.data ?? [], people, invoices.data ?? []).map((c) => ({
    ...c, accessBlockedSince: oldestBlock((access.data ?? []).filter((a) => a.workspace_id === c.id)),
  }));
}
