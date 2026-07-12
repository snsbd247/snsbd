/**
 * Server-only audit log helper. Never called from browser code.
 * Import inside handlers with `await import(...)` to keep the admin
 * client out of client-reachable bundles.
 */
export async function logAudit(opts: {
  actor_id?: string | null;
  action: string;
  entity?: string | null;
  entity_id?: string | null;
  meta?: Record<string, unknown> | null;
  ip?: string | null;
}): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("audit_logs").insert({
      actor_id: opts.actor_id ?? null,
      action: opts.action,
      entity: opts.entity ?? null,
      entity_id: opts.entity_id ?? null,
      meta: (opts.meta ?? null) as any,
      ip: opts.ip ?? null,
    } as any);
  } catch (e) {
    console.error("logAudit failed", e);
  }
}
