import { createFileRoute } from "@tanstack/react-router";

// pg_cron calls this daily. It scans services flagged as `renewable`
// whose expiry_date is within the next 10 days and creates a draft
// invoice for each unless one was already generated in the last 30 days.
export const Route = createFileRoute("/api/public/hooks/renew-invoices")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const today = new Date();
        const cutoff = new Date();
        cutoff.setDate(today.getDate() + 10);
        const cutoffISO = cutoff.toISOString().slice(0, 10);
        const todayISO = today.toISOString().slice(0, 10);
        const dupWindow = new Date();
        dupWindow.setDate(today.getDate() - 30);

        const { data: services, error } = await supabaseAdmin
          .from("services")
          .select("id, customer_id, project_id, type, name, details, sale_price, expiry_date, last_renewal_invoice_at, renewable")
          .eq("renewable", true)
          .in("status", ["active", "expired"])
          .not("expiry_date", "is", null)
          .lte("expiry_date", cutoffISO)
          .gte("expiry_date", todayISO);

        if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });

        const created: string[] = [];
        for (const s of services ?? []) {
          if (s.last_renewal_invoice_at && new Date(s.last_renewal_invoice_at) > dupWindow) continue;

          const subtotal = Number(s.sale_price) || 0;
          const invoice_number = "INV-" + Date.now().toString().slice(-8) + "-" + Math.floor(Math.random() * 90 + 10);
          const due = new Date(s.expiry_date!);
          const { data: inv, error: invErr } = await supabaseAdmin.from("invoices").insert({
            customer_id: s.customer_id,
            project_id: s.project_id,
            invoice_number,
            subtotal, tax: 0, total: subtotal, amount_paid: 0,
            status: "draft",
            issue_date: todayISO,
            due_date: due.toISOString().slice(0, 10),
            notes: `Auto-generated renewal for ${s.type} "${s.name}" (expires ${s.expiry_date}).`,
          }).select("id").single();
          if (invErr || !inv) continue;

          await supabaseAdmin.from("invoice_items").insert({
            invoice_id: inv.id,
            service_id: s.id,
            description: `${s.type.toUpperCase()} renewal — ${s.name}${s.details ? " (" + s.details + ")" : ""}`,
            quantity: 1,
            unit_price: subtotal,
            total: subtotal,
          });

          await supabaseAdmin.from("services").update({ last_renewal_invoice_at: new Date().toISOString() }).eq("id", s.id);
          created.push(inv.id);
        }

        return Response.json({ ok: true, count: created.length, invoice_ids: created });
      },
    },
  },
});
