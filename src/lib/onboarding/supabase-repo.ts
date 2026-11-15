import { createAdminClient } from "@/lib/supabase/admin";
import { planAttach } from "./attach";
import type { ProvisionRepo } from "./provision";

/** Server-only. Uses the service role, which bypasses RLS: never import from client code. */
export function createSupabaseProvisionRepo(): ProvisionRepo {
  const db = createAdminClient();
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
    async upsertUserByEmail(rawEmail, locale) {
      const email = rawEmail.trim().toLowerCase();
      const { data: existing, error: lookupErr } = await db.from("app_user").select("id").eq("email", email).maybeSingle();
      if (lookupErr) throw lookupErr;
      if (existing) {
        const { data: au, error: authErr } = await db.auth.admin.getUserById(existing.id as string);
        if (authErr || !au.user) throw authErr ?? new Error("auth user missing");
        if (planAttach({ confirmed: !!au.user.email_confirmed_at }) === "use") return existing.id as string;
        // Nobody has proven they own this address, so a stranger could have signed up with it first. Remove that
        // account (it cannot have a workspace) and make a fresh, confirmed one for the paying customer.
        const { error: delErr } = await db.auth.admin.deleteUser(existing.id as string);
        if (delErr) throw delErr;
      }
      const { data, error } = await db.auth.admin.createUser({ email, email_confirm: true });
      if (error || !data.user) throw error ?? new Error("createUser failed");
      const { error: localeErr } = await db.from("app_user").update({ locale }).eq("id", data.user.id);
      if (localeErr) throw localeErr;
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
