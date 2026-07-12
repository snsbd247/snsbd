import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listWebhooks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("outbound_webhooks")
      .select("id, url, events, is_active, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const { data: deliveries } = await context.supabase
      .from("webhook_deliveries")
      .select("id, webhook_id, event, status_code, error, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    return { items: data ?? [], deliveries: deliveries ?? [] };
  });

export const createWebhook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { url: string; events: string[] }) => d)
  .handler(async ({ data, context }) => {
    if (!/^https?:\/\//.test(data.url)) throw new Error("URL must start with http(s)://");
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    const secret = "whsec_" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    const { error } = await context.supabase.from("outbound_webhooks").insert({
      user_id: context.userId,
      url: data.url,
      secret,
      events: data.events.length ? data.events : ["invoice.paid"],
    });
    if (error) throw new Error(error.message);
    return { secret };
  });

export const deleteWebhook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("outbound_webhooks")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
