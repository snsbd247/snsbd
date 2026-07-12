import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type CreateHostingOrderInput = {
  package_id: string;
  domain_name: string;
  billing_cycle: string;
  payment_method: "manual_bkash" | "bkash_online";
  manual_trx_id?: string;
  manual_sender?: string;
  customer_notes?: string;
};

export const createHostingOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: CreateHostingOrderInput) => {
    if (!data.package_id) throw new Error("Package is required");
    if (!data.domain_name?.trim() || !data.domain_name.includes(".")) throw new Error("Valid domain required");
    if (!data.payment_method) throw new Error("Payment method required");
    if (data.payment_method === "manual_bkash" && !data.manual_trx_id?.trim()) {
      throw new Error("bKash transaction ID required");
    }
    return data;
  })
  .handler(async ({ data, context }) => {
    const { data: pkg, error: pErr } = await context.supabase
      .from("hosting_packages")
      .select("id, name, price, billing_cycle")
      .eq("id", data.package_id)
      .maybeSingle();
    if (pErr || !pkg) throw new Error("Package not found");

    const { data: order, error } = await context.supabase
      .from("customer_orders")
      .insert({
        customer_id: context.userId,
        order_type: "hosting" as any,
        hosting_package_id: pkg.id,
        domain_name: data.domain_name.trim().toLowerCase(),
        quoted_price: Number(pkg.price) || 0,
        status: "pending" as any,
        billing_cycle: data.billing_cycle || pkg.billing_cycle,
        payment_method: data.payment_method,
        manual_trx_id: data.manual_trx_id ?? null,
        manual_sender: data.manual_sender ?? null,
        customer_notes: data.customer_notes ?? null,
      } as any)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { order_id: order.id as string };
  });

export const activateHostingOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { order_id: string; whm_server_id?: string | null }) => data)
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Admins only");

    const { data: order, error } = await context.supabase
      .from("customer_orders")
      .select("*, hosting_packages(id, name)")
      .eq("id", data.order_id)
      .maybeSingle();
    if (error || !order) throw new Error("Order not found");
    if (order.order_type !== "hosting") throw new Error("Not a hosting order");
    if (order.status === "completed") throw new Error("Order already active");

    const domain = (order.domain_name || "").trim().toLowerCase();
    if (!domain || !domain.includes(".")) throw new Error("Order has no valid domain");

    const cpanelUser = domain.split(".")[0]!.replace(/[^a-z0-9]/g, "").slice(0, 8) || `u${Date.now().toString(36).slice(-6)}`;
    const cpanelPass = Array.from(crypto.getRandomValues(new Uint8Array(9)))
      .map((b) => "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789"[b % 55])
      .join("") + "!x9";

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Create the service row
    const { data: svc, error: sErr } = await supabaseAdmin
      .from("services")
      .insert({
        customer_id: order.customer_id,
        type: "hosting" as any,
        name: domain,
        details: order.hosting_packages?.name ?? null,
        status: "active" as any,
        purchase_date: new Date().toISOString().slice(0, 10),
        sale_price: order.quoted_price,
        hosting_package_id: order.hosting_package_id,
        cpanel_username: cpanelUser,
        cpanel_password: cpanelPass,
        whm_server_id: data.whm_server_id ?? order.whm_server_id ?? null,
        whm_account_user: cpanelUser,
      } as any)
      .select("id, whm_server_id")
      .single();
    if (sErr) throw new Error(sErr.message);

    let whmCreated = false;
    let whmError: string | null = null;
    if (svc.whm_server_id) {
      try {
        const { cpanelCreateAccount } = await import("@/lib/whm.functions");
        await cpanelCreateAccount({ data: { service_id: svc.id } });
        whmCreated = true;
      } catch (e: any) {
        whmError = e?.message ?? "WHM create failed";
      }
    }

    await supabaseAdmin
      .from("customer_orders")
      .update({
        status: "completed" as any,
        activated_service_id: svc.id,
        admin_notes: whmError
          ? `Activated. WHM: ${whmError}`
          : whmCreated
          ? "Activated. cPanel account created on WHM."
          : "Activated (no WHM link).",
      })
      .eq("id", order.id);

    return {
      ok: true,
      service_id: svc.id,
      cpanel_username: cpanelUser,
      cpanel_password: cpanelPass,
      whm_created: whmCreated,
      whm_error: whmError,
    };
  });
