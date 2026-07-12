// Server-only helper: dispatch an event to all matching outbound webhooks for a user.
// Uses supabaseAdmin because callers may run in payment callback context.
export async function emitWebhookEvent(userId: string, event: string, payload: Record<string, unknown>) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: hooks } = await supabaseAdmin
      .from("outbound_webhooks")
      .select("id, url, secret, events, is_active")
      .eq("user_id", userId)
      .eq("is_active", true);
    if (!hooks || !hooks.length) return;
    const body = JSON.stringify({ event, data: payload, ts: new Date().toISOString() });
    for (const h of hooks) {
      if (!h.events.includes(event)) continue;
      try {
        const sig = await hmacSha256Hex(h.secret, body);
        const res = await fetch(h.url, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Webhook-Signature": sig, "X-Webhook-Event": event },
          body,
        });
        const text = await res.text().catch(() => "");
        await supabaseAdmin.from("webhook_deliveries").insert({
          webhook_id: h.id, event, payload, status_code: res.status, response_body: text.slice(0, 2000),
        });
      } catch (e: any) {
        await supabaseAdmin.from("webhook_deliveries").insert({
          webhook_id: h.id, event, payload, error: String(e?.message ?? e),
        });
      }
    }
  } catch (e) {
    console.error("[webhook-emit]", e);
  }
}

async function hmacSha256Hex(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}
