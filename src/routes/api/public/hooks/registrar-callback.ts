import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { z } from "zod";

/**
 * Registrar callback endpoint.
 *
 * External systems (registrar polling scripts, ResellerClub push callbacks,
 * Namecheap manual reconciliation cron) POST domain status transitions here.
 *
 * Security: HMAC-SHA256 signature over the raw JSON body, using
 * REGISTRAR_WEBHOOK_SECRET, sent in header `x-registrar-signature`
 * as a lowercase hex string. Signature is verified with timing-safe compare.
 *
 * Body: { service_id: uuid, status: 'requested'|'processing'|'active'|'failed',
 *         message?: string, registrar_order_id?: string, metadata?: object }
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-registrar-signature",
};

const payloadSchema = z.object({
  service_id: z.string().uuid(),
  status: z.enum(["requested", "processing", "active", "failed"]),
  message: z.string().max(1000).optional(),
  registrar_order_id: z.string().max(128).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  } catch {
    return false;
  }
}

export const Route = createFileRoute("/api/public/hooks/registrar-callback")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS_HEADERS }),
      POST: async ({ request }) => {
        const secret = process.env.REGISTRAR_WEBHOOK_SECRET;
        if (!secret) {
          return new Response(JSON.stringify({ error: "Webhook secret not configured" }), {
            status: 500, headers: { "Content-Type": "application/json", ...CORS_HEADERS },
          });
        }

        const raw = await request.text();
        const signature = (request.headers.get("x-registrar-signature") ?? "").toLowerCase().trim();
        const expected = createHmac("sha256", secret).update(raw).digest("hex");
        if (!signature || !safeEqualHex(signature, expected)) {
          return new Response(JSON.stringify({ error: "Invalid signature" }), {
            status: 401, headers: { "Content-Type": "application/json", ...CORS_HEADERS },
          });
        }

        let json: unknown;
        try { json = JSON.parse(raw); } catch {
          return new Response(JSON.stringify({ error: "Invalid JSON" }), {
            status: 400, headers: { "Content-Type": "application/json", ...CORS_HEADERS },
          });
        }

        const parsed = payloadSchema.safeParse(json);
        if (!parsed.success) {
          return new Response(JSON.stringify({ error: "Invalid payload", issues: parsed.error.issues }), {
            status: 400, headers: { "Content-Type": "application/json", ...CORS_HEADERS },
          });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { service_id, status, message, registrar_order_id, metadata } = parsed.data;

        const serviceUpdate: Record<string, unknown> = { provisioning_status: status };
        if (status === "active") serviceUpdate.status = "active";
        if (registrar_order_id) serviceUpdate.registrar_order_id = registrar_order_id;
        if (metadata) serviceUpdate.registrar_meta = metadata;

        const [{ error: upErr }, { error: evErr }] = await Promise.all([
          supabaseAdmin.from("services").update(serviceUpdate as never).eq("id", service_id),
          supabaseAdmin.from("service_events").insert({
            service_id, status,
            message: message ?? `Registrar reported status: ${status}`,
            metadata: (metadata ?? null) as never,
          }),
        ]);

        if (upErr || evErr) {
          return new Response(JSON.stringify({ error: upErr?.message ?? evErr?.message ?? "DB error" }), {
            status: 500, headers: { "Content-Type": "application/json", ...CORS_HEADERS },
          });
        }

        // Client notification: attach a lead-like ping so admins see it in the app.
        // (Email/SMS notifications flow through the existing overdue-enforcement pattern.)
        return new Response(JSON.stringify({ ok: true }), {
          status: 200, headers: { "Content-Type": "application/json", ...CORS_HEADERS },
        });
      },
    },
  },
});
