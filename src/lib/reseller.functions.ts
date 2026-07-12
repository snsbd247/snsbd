import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: any) {
  const { data: ok } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!ok) throw new Error("Admins only");
}

/** Admin: list all resellers (users with 'reseller' role) with their linked customer counts. */
export const listResellers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data: roles, error } = await context.supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "reseller");
    if (error) throw new Error(error.message);
    const ids = (roles ?? []).map((r: any) => r.user_id);
    if (!ids.length) return { items: [] };
    const { data: profiles } = await context.supabase
      .from("profiles")
      .select("id, email, full_name")
      .in("id", ids);
    const { data: links } = await context.supabase
      .from("reseller_customers")
      .select("reseller_id")
      .in("reseller_id", ids);
    const counts: Record<string, number> = {};
    (links ?? []).forEach((l: any) => { counts[l.reseller_id] = (counts[l.reseller_id] ?? 0) + 1; });
    return { items: (profiles ?? []).map((p: any) => ({ ...p, customer_count: counts[p.id] ?? 0 })) };
  });

/** Admin: grant / revoke reseller role by email. */
export const setResellerRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { email: string; grant: boolean }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: prof } = await context.supabase.from("profiles").select("id").ilike("email", data.email).maybeSingle();
    if (!prof) throw new Error("User not found");
    if (data.grant) {
      const { error } = await context.supabase.from("user_roles").upsert(
        { user_id: prof.id, role: "reseller" as any }, { onConflict: "user_id,role" },
      );
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase.from("user_roles").delete().eq("user_id", prof.id).eq("role", "reseller" as any);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

/** Reseller: my customers. */
export const listMyCustomers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: links, error } = await context.supabase
      .from("reseller_customers")
      .select("customer_id, created_at")
      .eq("reseller_id", context.userId);
    if (error) throw new Error(error.message);
    const ids = (links ?? []).map((l: any) => l.customer_id);
    if (!ids.length) return { items: [] };
    const { data: profiles } = await context.supabase
      .from("profiles").select("id, email, full_name").in("id", ids);
    return { items: profiles ?? [] };
  });

/** Admin: link/unlink a customer to a reseller. */
export const linkResellerCustomer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { reseller_id: string; customer_email: string; link: boolean }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: cust } = await context.supabase.from("profiles").select("id").ilike("email", data.customer_email).maybeSingle();
    if (!cust) throw new Error("Customer not found");
    if (data.link) {
      const { error } = await context.supabase.from("reseller_customers").upsert(
        { reseller_id: data.reseller_id, customer_id: cust.id }, { onConflict: "reseller_id,customer_id" },
      );
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase.from("reseller_customers").delete()
        .eq("reseller_id", data.reseller_id).eq("customer_id", cust.id);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });
