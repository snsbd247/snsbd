import { createFileRoute } from "@tanstack/react-router";
import { processRenewalsBatch } from "@/lib/renewals.functions";

/**
 * Cron endpoint. Called daily by pg_cron with `apikey: <SUPABASE_ANON_KEY>` header.
 * Runs renewal reminders, invoice generation, and overdue suspensions.
 */
export const Route = createFileRoute("/api/public/hooks/renewals")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const anon = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
        const apikey = request.headers.get("apikey") || request.headers.get("x-api-key");
        if (!anon || !apikey || apikey !== anon) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401, headers: { "Content-Type": "application/json" },
          });
        }
        try {
          const result = await processRenewalsBatch();
          return new Response(JSON.stringify({ ok: true, ...result }), {
            status: 200, headers: { "Content-Type": "application/json" },
          });
        } catch (e: any) {
          return new Response(JSON.stringify({ error: e?.message ?? String(e) }), {
            status: 500, headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
