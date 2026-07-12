import { createFileRoute } from "@tanstack/react-router";
import { authenticateApiKey, json, CORS } from "@/lib/api-auth.server";

export const Route = createFileRoute("/api/public/v1/invoices")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const auth = await authenticateApiKey(request);
        if (!auth) return json({ error: "Unauthorized" }, 401);
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: isReseller } = await supabaseAdmin.rpc("has_role", { _user_id: auth.userId, _role: "reseller" as any });
        let query = supabaseAdmin.from("invoices").select("id, invoice_number, customer_id, total, status, due_date, issue_date, created_at").limit(500);
        if (isReseller) {
          const { data: links } = await supabaseAdmin.from("reseller_customers").select("customer_id").eq("reseller_id", auth.userId);
          const ids = (links ?? []).map((l: any) => l.customer_id);
          query = query.in("customer_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
        } else {
          query = query.eq("customer_id", auth.userId);
        }
        const { data, error } = await query;
        if (error) return json({ error: error.message }, 500);
        return json({ data });
      },
    },
  },
});
