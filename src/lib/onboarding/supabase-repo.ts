import { createClient } from "@supabase/supabase-js";
import type { ProvisionRepo } from "./provision";

/** Server-only. Uses the service role, which bypasses RLS: never import from client code. */
export function createSupabaseProvisionRepo(): ProvisionRepo {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase admin is not configured (SUPABASE_SERVICE_ROLE_KEY)");
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return {
    async workspaceExistsForPayment(provider, paymentId) {
      const { data, error } = await db.from("workspace").select("id")
        .eq("payment_provider", provider).eq("payment_id", paymentId).maybeSingle();
      if (error) throw error;
      return !!data;
    },
    async recordEvent(id, provider, type) {
      const { error } = await db.from("payment_event").upsert({ id, provider, type }, { onConflict: "id" });
      if (error) throw error;
    },
    async upsertUserByEmail(email, locale) {
      const { data: existing } = await db.from("app_user").select("id").eq("email", email).maybeSingle();
      if (existing) return existing.id as string;
      const { data, error } = await db.auth.admin.createUser({ email, email_confirm: true });
      if (error || !data.user) throw error ?? new Error("createUser failed");
      await db.from("app_user").update({ locale }).eq("id", data.user.id);
      return data.user.id;
    },
    async createWorkspace(w) {
      const { data, error } = await db.from("workspace").insert({
        company: w.company, plan: w.plan, language: w.language, owner_id: w.ownerId,
        payment_provider: w.paymentProvider, payment_id: w.paymentId, contact_email: w.contactEmail,
      }).select("id").single();
      if (error) throw error;
      return data.id as string;
    },
    async addMembership(workspaceId, userId, role) {
      const { error } = await db.from("membership").insert({ workspace_id: workspaceId, user_id: userId, role });
      if (error) throw error;
    },
    async addTasks(workspaceId, userId, tasks) {
      const { error } = await db.from("task").insert(
        tasks.map((t) => ({ workspace_id: workspaceId, type: t.type, due_at: t.dueAt, assignee: userId })),
      );
      if (error) throw error;
    },
    async sendInvite(email) {
      // Magic-link email for now; localised React Email via Resend replaces this next.
      const { error } = await db.auth.signInWithOtp({
        email, options: { emailRedirectTo: `${appUrl}/auth/callback`, shouldCreateUser: false },
      });
      if (error) throw error;
    },
  };
}
