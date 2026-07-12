import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: any) {
  const { data: ok } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!ok) throw new Error("Admins only");
}

export const listAddons = createServerFn({ method: "GET" })
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("product_addons")
      .select("id, name, description, price, billing_cycle, hosting_package_id, is_active")
      .eq("is_active", true)
      .order("name");
    return { items: data ?? [] };
  });

export const saveAddon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    id?: string; name: string; description?: string; price: number;
    billing_cycle?: string; hosting_package_id?: string | null; is_active?: boolean;
  }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const payload = {
      name: data.name, description: data.description ?? null,
      price: data.price, billing_cycle: data.billing_cycle ?? "monthly",
      hosting_package_id: data.hosting_package_id ?? null,
      is_active: data.is_active ?? true,
    };
    if (data.id) {
      const { error } = await context.supabase.from("product_addons").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase.from("product_addons").insert(payload);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteAddon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("product_addons").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Public: validate coupon (used at checkout). */
export const validateCoupon = createServerFn({ method: "POST" })
  .inputValidator((d: { code: string; subtotal: number }) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const code = data.code.trim().toUpperCase();
    if (!code) return { valid: false, reason: "Enter a code" };
    const { data: c } = await supabaseAdmin.from("coupons").select("*").eq("code", code).maybeSingle();
    if (!c || !c.is_active) return { valid: false, reason: "Invalid coupon" };
    if (c.expires_at && new Date(c.expires_at) < new Date()) return { valid: false, reason: "Coupon expired" };
    if (c.max_uses != null && c.used_count >= c.max_uses) return { valid: false, reason: "Coupon exhausted" };
    let discount = 0;
    if (c.discount_percent) discount += Number(data.subtotal) * (Number(c.discount_percent) / 100);
    if (c.discount_amount) discount += Number(c.discount_amount);
    discount = Math.min(discount, data.subtotal);
    return { valid: true, discount, id: c.id, code: c.code };
  });

export const listCoupons = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data } = await context.supabase.from("coupons").select("*").order("created_at", { ascending: false });
    return { items: data ?? [] };
  });

export const saveCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    id?: string; code: string; description?: string;
    discount_percent?: number | null; discount_amount?: number | null;
    max_uses?: number | null; expires_at?: string | null; is_active?: boolean;
  }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const payload = {
      code: data.code.trim().toUpperCase(),
      description: data.description ?? null,
      discount_percent: data.discount_percent ?? null,
      discount_amount: data.discount_amount ?? null,
      max_uses: data.max_uses ?? null,
      expires_at: data.expires_at ?? null,
      is_active: data.is_active ?? true,
    };
    if (!payload.discount_percent && !payload.discount_amount) throw new Error("Set percent or amount discount");
    if (data.id) {
      const { error } = await context.supabase.from("coupons").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase.from("coupons").insert(payload);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("coupons").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
