import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: any) {
  const { data: ok } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!ok) throw new Error("Admins only");
}

/** My referral code + stats (customer or admin). */
export const getMyReferral = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("referral_code, referred_by")
      .eq("id", context.userId)
      .maybeSingle();
    const { data: commissions } = await context.supabase
      .from("referral_commissions")
      .select("id, amount, status, created_at, paid_at, invoice_id, referred_user_id, profiles:referred_user_id(email, full_name)")
      .eq("referrer_id", context.userId)
      .order("created_at", { ascending: false });
    const totals = { pending: 0, paid: 0, void: 0 };
    for (const c of commissions ?? []) {
      const k = (c.status ?? "pending") as keyof typeof totals;
      totals[k] += Number(c.amount) || 0;
    }
    return { code: profile?.referral_code ?? null, referred_by: profile?.referred_by ?? null, commissions: commissions ?? [], totals };
  });

/** Redeem a referral code (only once, by referred customer themselves). */
export const applyReferralCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { code: string }) => d)
  .handler(async ({ data, context }) => {
    const code = data.code.trim().toUpperCase();
    if (!code) throw new Error("Enter a referral code");
    const { data: me } = await context.supabase.from("profiles").select("id, referral_code, referred_by").eq("id", context.userId).maybeSingle();
    if (!me) throw new Error("Profile missing");
    if (me.referred_by) throw new Error("You already have a referrer");
    if (me.referral_code === code) throw new Error("You can't refer yourself");
    const { data: ref } = await context.supabase.from("profiles").select("id").eq("referral_code", code).maybeSingle();
    if (!ref) throw new Error("Invalid referral code");
    const { error } = await context.supabase.from("profiles").update({ referred_by: ref.id }).eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Admin: list all commissions with filter. */
export const listAllCommissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { status?: string } | undefined) => d ?? {})
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    let q = context.supabase
      .from("referral_commissions")
      .select("id, amount, status, created_at, paid_at, referrer_id, referred_user_id, invoice_id, rate_percent, referrer:referrer_id(email, full_name), referred:referred_user_id(email, full_name)")
      .order("created_at", { ascending: false })
      .limit(500);
    if (data?.status) q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { items: rows ?? [] };
  });

/** Admin: update commission status (paid / void). */
export const setCommissionStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; status: "pending" | "paid" | "void" }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const patch: any = { status: data.status };
    if (data.status === "paid") patch.paid_at = new Date().toISOString();
    else patch.paid_at = null;
    const { error } = await context.supabase.from("referral_commissions").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    const { logAudit } = await import("@/lib/audit.server");
    await logAudit({ actor_id: context.userId, action: "referral.status", entity: "referral_commission", entity_id: data.id, meta: { status: data.status } });
    return { ok: true };
  });
