import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { db } from "@/lib/db-shim";

const BKASH_HOSTS = {
  sandbox: "https://tokenized.sandbox.bka.sh/v1.2.0-beta",
  live: "https://tokenized.pay.bka.sh/v1.2.0-beta",
};

type BkashCreds = {
  mode: "sandbox" | "live";
  app_key: string;
  app_secret: string;
  username: string;
  password: string;
};

async function loadBkash(context: any): Promise<BkashCreds> {
  const { data, error } = await context.supabase
    .from("payment_gateways")
    .select("*")
    .eq("provider", "bkash")
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("bKash gateway is not configured or inactive.");
  if (!data.app_key || !data.app_secret || !data.username || !data.password) {
    throw new Error("bKash credentials incomplete.");
  }
  return data as BkashCreds;
}

async function grantToken(c: BkashCreds): Promise<string> {
  const res = await fetch(`${BKASH_HOSTS[c.mode]}/tokenized/checkout/token/grant`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      username: c.username,
      password: c.password,
    },
    body: JSON.stringify({ app_key: c.app_key, app_secret: c.app_secret }),
  });
  const body = await res.json();
  if (!res.ok || !body.id_token) throw new Error(body.statusMessage || "bKash token grant failed");
  return body.id_token as string;
}

export const bkashCreatePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { invoice_id: string; amount: number; callback_url: string }) => data)
  .handler(async ({ data, context }) => {
    const { data: inv, error: iErr } = await context.supabase
      .from("invoices")
      .select("id, invoice_number, total, amount_paid, customer_id")
      .eq("id", data.invoice_id)
      .maybeSingle();
    if (iErr || !inv) throw new Error("Invoice not found");
    if (inv.customer_id !== context.userId) throw new Error("Not your invoice");
    const outstanding = Number(inv.total) - Number(inv.amount_paid);
    const amount = Math.min(data.amount, outstanding);
    if (amount <= 0) throw new Error("Invoice already paid");

    const creds = await loadBkash(context);
    const token = await grantToken(creds);
    const merchantInvoiceNumber = `${inv.invoice_number}-${Date.now().toString(36)}`;

    const res = await fetch(`${BKASH_HOSTS[creds.mode]}/tokenized/checkout/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        authorization: token,
        "x-app-key": creds.app_key,
      },
      body: JSON.stringify({
        mode: "0011",
        payerReference: inv.invoice_number,
        callbackURL: data.callback_url,
        amount: amount.toFixed(2),
        currency: "BDT",
        intent: "sale",
        merchantInvoiceNumber,
      }),
    });
    const body = await res.json();
    if (!res.ok || !body.paymentID || !body.bkashURL) {
      throw new Error(body.statusMessage || body.errorMessage || "bKash create failed");
    }

    await context.supabase.from("payment_transactions").insert({
      invoice_id: inv.id,
      customer_id: context.userId,
      provider: "bkash",
      amount,
      provider_payment_id: body.paymentID,
      status: "initiated",
      raw_response: body,
    });

    return { paymentID: body.paymentID as string, bkashURL: body.bkashURL as string };
  });

export const bkashExecutePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { paymentID: string }) => data)
  .handler(async ({ data, context }) => {
    const { data: txn, error: tErr } = await context.supabase
      .from("payment_transactions")
      .select("*")
      .eq("provider_payment_id", data.paymentID)
      .maybeSingle();
    if (tErr || !txn) throw new Error("Transaction not found");
    if (txn.customer_id !== context.userId) throw new Error("Not your transaction");

    const creds = await loadBkash(context);
    const token = await grantToken(creds);

    const res = await fetch(`${BKASH_HOSTS[creds.mode]}/tokenized/checkout/execute`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        authorization: token,
        "x-app-key": creds.app_key,
      },
      body: JSON.stringify({ paymentID: data.paymentID }),
    });
    const body = await res.json();
    const ok = res.ok && body.transactionStatus === "Completed" && body.statusCode === "0000";

    await context.supabase
      .from("payment_transactions")
      .update({
        status: ok ? "completed" : "failed",
        provider_trx_id: body.trxID ?? null,
        raw_response: body,
      })
      .eq("id", txn.id);

    if (ok) {
      // Load supabaseAdmin for write-through: RLS on invoices only allows admins.
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: inv } = await supabaseAdmin
        .from("invoices")
        .select("id, total, amount_paid, customer_id")
        .eq("id", txn.invoice_id)
        .maybeSingle();
      if (inv) {
        const newPaid = Number(inv.amount_paid) + Number(txn.amount);
        const status = newPaid >= Number(inv.total) ? "paid" : "partial";
        await supabaseAdmin.from("invoices").update({ amount_paid: newPaid, status }).eq("id", inv.id);
        await supabaseAdmin.from("payments").insert({
          invoice_id: inv.id,
          amount: txn.amount,
          method: "bkash",
          reference: body.trxID ?? data.paymentID,
          paid_at: new Date().toISOString(),
        });
        if (status === "paid") {
          const { autoRenewOnInvoicePaid } = await import("@/lib/auto-renew.server");
          await autoRenewOnInvoicePaid(inv.id);
          const { emitReferralCommission } = await import("@/lib/referrals.server");
          await emitReferralCommission(inv.id);
        }
      }
    }

    return { ok, trxID: body.trxID ?? null, message: body.statusMessage ?? body.errorMessage ?? "" };
  });
