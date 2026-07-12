/**
 * Server-only helper: when a renewal invoice is marked fully paid,
 * extend the linked service's expiry_date by 1 year, reset the reminder
 * stage, unsuspend a hosting account via WHM if applicable, and record
 * a service_events row. Best-effort — failures are logged and swallowed
 * so the payment flow succeeds regardless.
 */
export async function autoRenewOnInvoicePaid(invoiceId: string): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: inv } = await supabaseAdmin
      .from("invoices")
      .select("id, status, is_renewal")
      .eq("id", invoiceId)
      .maybeSingle();
    if (!inv || inv.status !== "paid" || !inv.is_renewal) return;

    const { data: items } = await supabaseAdmin
      .from("invoice_items")
      .select("service_id")
      .eq("invoice_id", invoiceId)
      .not("service_id", "is", null);

    const serviceIds = Array.from(new Set((items ?? []).map((i: any) => i.service_id as string)));
    if (!serviceIds.length) return;

    const { data: services } = await supabaseAdmin
      .from("services")
      .select("id, name, type, status, expiry_date, whm_server_id, whm_account_user, cpanel_username")
      .in("id", serviceIds);

    for (const s of services ?? []) {
      const base = s.expiry_date ? new Date(s.expiry_date + "T00:00:00Z") : new Date();
      const next = new Date(base);
      next.setUTCFullYear(next.getUTCFullYear() + 1);

      await supabaseAdmin.from("services").update({
        expiry_date: next.toISOString().slice(0, 10),
        status: "active",
        renewal_reminder_stage: 0,
      }).eq("id", s.id);

      await supabaseAdmin.from("service_events").insert({
        service_id: s.id,
        status: "renewed",
        message: `Auto-renewed until ${next.toISOString().slice(0, 10)} (invoice ${invoiceId})`,
      } as any);

      // Unsuspend cPanel account if suspended
      if (s.type === "hosting" && s.status === "suspended" && s.whm_server_id) {
        const user = s.whm_account_user || s.cpanel_username;
        if (!user) continue;
        try {
          const { data: srv } = await supabaseAdmin
            .from("whm_servers")
            .select("hostname, port, username, api_token, auth_type")
            .eq("id", s.whm_server_id)
            .maybeSingle();
          if (!srv) continue;
          const auth = srv.auth_type === "password"
            ? `Basic ${btoa(`${srv.username}:${srv.api_token}`)}`
            : `whm ${srv.username}:${srv.api_token}`;
          const url = `https://${srv.hostname}:${srv.port}/json-api/unsuspendacct?api.version=1&user=${encodeURIComponent(user)}`;
          const res = await fetch(url, { headers: { Authorization: auth, Accept: "application/json" } });
          await supabaseAdmin.from("service_events").insert({
            service_id: s.id,
            status: res.ok ? "unsuspended" : "unsuspend_failed",
            message: res.ok ? "WHM unsuspend succeeded" : `WHM unsuspend HTTP ${res.status}`,
          } as any);
        } catch (e: any) {
          await supabaseAdmin.from("service_events").insert({
            service_id: s.id,
            status: "unsuspend_failed",
            message: `WHM unsuspend error: ${e?.message ?? String(e)}`,
          } as any);
        }
      }

      // Renew domain via Namecheap
      if (s.type === "domain" && s.name) {
        try {
          const { renewDomainNamecheap } = await import("@/lib/namecheap-renew.server");
          const r = await renewDomainNamecheap(s.name);
          await supabaseAdmin.from("service_events").insert({
            service_id: s.id,
            status: r.ok ? "domain_renewed" : "domain_renew_failed",
            message: r.ok
              ? `Namecheap renewed until ${r.expiry ?? "?"} (txn ${r.orderId ?? "-"})`
              : `Namecheap error: ${r.error}`,
          } as any);
          if (r.ok && r.expiry) {
            await supabaseAdmin.from("services").update({ expiry_date: r.expiry }).eq("id", s.id);
          }
        } catch (e: any) {
          await supabaseAdmin.from("service_events").insert({
            service_id: s.id, status: "domain_renew_failed",
            message: `Namecheap renew error: ${e?.message ?? String(e)}`,
          } as any);
        }
      }
    }
  } catch (e) {
    // Never fail the payment path
    console.error("autoRenewOnInvoicePaid failed", e);
  }
}
