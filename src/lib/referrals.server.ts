/**
 * Server-only: on paid invoice, credit the referrer 10% commission
 * (idempotent via UNIQUE(invoice_id, referrer_id)).
 */
export async function emitReferralCommission(invoiceId: string): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: inv } = await supabaseAdmin
      .from("invoices").select("id, total, status, customer_id").eq("id", invoiceId).maybeSingle();
    if (!inv || inv.status !== "paid" || !inv.customer_id) return;
    const { data: cust } = await supabaseAdmin
      .from("profiles").select("referred_by").eq("id", inv.customer_id).maybeSingle();
    if (!cust?.referred_by) return;
    const rate = 10;
    const amount = Math.round(Number(inv.total) * rate) / 100;
    if (amount <= 0) return;
    await supabaseAdmin.from("referral_commissions").insert({
      referrer_id: cust.referred_by,
      referred_user_id: inv.customer_id,
      invoice_id: inv.id,
      amount,
      rate_percent: rate,
      status: "pending",
    } as any).select();
    // notify referrer
    await supabaseAdmin.from("notifications").insert({
      user_id: cust.referred_by,
      type: "referral",
      title: `You earned ${amount} in referral commission`,
      body: `A customer you referred paid invoice ${inv.id.slice(0, 8)}.`,
      link: "/profile",
    } as any);
  } catch (e) {
    console.error("emitReferralCommission failed", e);
  }
}
