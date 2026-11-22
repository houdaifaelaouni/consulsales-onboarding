"use server";

import { revalidatePath } from "next/cache";
import { createAgency, type CreateAgencyResult } from "@/lib/agency/admin";
import { createSupabaseAgencyAdminRepo } from "@/lib/agency/supabase-admin-repo";
import { getViewer } from "@/lib/auth/viewer";

/** Admin only, checked here again because a server action is a public endpoint. Public sign-up stays closed: agencies are made by us. */
export async function createAgencyAction(name: string, ownerEmail: string): Promise<CreateAgencyResult | { ok: false; reason: "forbidden" }> {
  const viewer = await getViewer();
  if (!viewer?.isAdmin) return { ok: false, reason: "forbidden" };
  const r = await createAgency(createSupabaseAgencyAdminRepo(), { name, ownerEmail });
  if (r.ok) revalidatePath("/admin/agencies");
  return r;
}
