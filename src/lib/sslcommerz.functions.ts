import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// SSLCommerz Hosted Checkout (BDT). Supports bKash, Nagad, Rocket, Cards, NetBanking.
// Sandbox: https://developer.sslcommerz.com/
// Fields:  store_id, store_passwd (secret), mode ('sandbox'|'live')

const HOSTS = {
  sandbox: "https://sandbox.sslcommerz.com",
  live: "https://securepay.sslcommerz.com",
};

type Creds = { mode: "sandbox" | "live"; store_id: string; store_passwd: string };

async function loadCreds(context: any): Promise<Creds> {
  const { data, error } = await context.supabase
    .from("payment_gateways")
    .select("*")
    .eq("provider", "sslcommerz")
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("SSLCommerz gateway is not configured or inactive.");
  // Reuse the generic columns: username = store_id, password = store_passwd
  const store_id = data.username;
  const store_passwd = data.password;
  if (!store_id || !store_passwd) throw new Error("SSLCommerz store credentials incomplete.");
  return { mode: data.mode, store_id, store_passwd };
}

export const sslczCreatePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { invoice_id: string; amount: number; callback_url: string }) => data)
  .handler(async ({ data, context }) => {
    const { data: inv, error } = await context.supabase
      .from("invoices")
      .select("id, invoice_number, total, amount_paid, customer_id, profiles!invoices_customer_id_fkey(email, full_name, phone, address)")
      .eq("id", data.invoice_id)
      .maybeSingle();
    if (error || !inv) throw new Error("Invoice not found");
    if (inv.customer_id !== context.userId) throw new Error("Not your invoice");
    const outstanding = Number(inv.total) - Number(inv.amount_paid);
    const amount = Math.min(data.amount, outstanding);
    if (amount <= 0) throw new Error("Invoice already paid");

    const creds = await loadCreds(context);
    const tran_id = `${inv.invoice_number}-${Date.now().toString(36)}`;
    const prof: any = (inv as any).profiles ?? {};

    const form = new URLSearchParams({
      store_id: creds.store_id,
      store_passwd: creds.store_passwd,
      total_amount: amount.toFixed(2),
      currency: "BDT",
      tran_id,
      success_url: data.callback_url + "?st=success",
      fail_url: data.callback_url + "?st=fail",
      cancel_url: data.callback_url + "?st=cancel",
      ipn_url: data.callback_url + "?st=ipn",
      shipping_method: "NO",
      product_name: `Invoice ${inv.invoice_number}`,
      product_category: "Service",
      product_profile: "non-physical-goods",
      cus_name: prof.full_name ?? "Customer",
      cus_email: prof.email ?? "no@example.com",
      cus_add1: prof.address ?? "N/A",
      cus_city: "Dhaka",
      cus_country: "Bangladesh",
      cus_phone: prof.phone ?? "01700000000",
    });

    const res = await fetch(`${HOSTS[creds.mode]}/gwprocess/v4/api.php`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
    });
    const body = await res.json();
    if (body.status !== "SUCCESS" || !body.GatewayPageURL) {
      throw new Error(body.failedreason || "SSLCommerz session create failed");
    }

    await context.supabase.from("payment_transactions").insert({
      invoice_id: inv.id,
      customer_id: context.userId,
      provider: "sslcommerz",
      amount,
      provider_payment_id: tran_id,
      status: "initiated",
      raw_response: body,
    });

    return { tran_id, gatewayURL: body.GatewayPageURL as string };
  });

export const sslczValidatePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { tran_id: string; val_id?: string }) => data)
  .handler(async ({ data, context }) => {
    const { data: txn, error } = await context.supabase
      .from("payment_transactions")
      .select("*")
      .eq("provider_payment_id", data.tran_id)
      .maybeSingle();
    if (error || !txn) throw new Error("Transaction not found");
    if (txn.customer_id !== context.userId) throw new Error("Not your transaction");

    const creds = await loadCreds(context);
    let ok = false;
    let body: any = null;
    if (data.val_id) {
      const url = `${HOSTS[creds.mode]}/validator/api/validationserverAPI.php?val_id=${encodeURIComponent(
        data.val_id,
      )}&store_id=${encodeURIComponent(creds.store_id)}&store_passwd=${encodeURIComponent(
        creds.store_passwd,
      )}&format=json`;
      const res = await fetch(url);
      body = await res.json();
      ok = res.ok && (body.status === "VALID" || body.status === "VALIDATED");
    }

    await context.supabase
      .from("payment_transactions")
      .update({
        status: ok ? "completed" : "failed",
        provider_trx_id: body?.bank_tran_id ?? body?.tran_id ?? null,
        raw_response: body ?? { note: "no val_id" },
      })
      .eq("id", txn.id);

    if (ok) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: inv } = await supabaseAdmin
        .from("invoices").select("id, total, amount_paid").eq("id", txn.invoice_id).maybeSingle();
      if (inv) {
        const newPaid = Number(inv.amount_paid) + Number(txn.amount);
        const status = newPaid >= Number(inv.total) ? "paid" : "partial";
        await supabaseAdmin.from("invoices").update({ amount_paid: newPaid, status }).eq("id", inv.id);
        await supabaseAdmin.from("payments").insert({
          invoice_id: inv.id,
          amount: txn.amount,
          method: "sslcommerz",
          reference: body?.bank_tran_id ?? data.tran_id,
          paid_at: new Date().toISOString(),
        });
        if (status === "paid") {
          const { autoRenewOnInvoicePaid } = await import("@/lib/auto-renew.server");
          await autoRenewOnInvoicePaid(inv.id);
        }
      }
    }

    return { ok, message: body?.status ?? "no validation" };
  });
