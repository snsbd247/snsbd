import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function isAdmin(context: any) {
  const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  return !!data;
}

export const createSupportTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { subject: string; body: string; priority?: string; service_id?: string | null }) => {
    const subject = (data?.subject ?? "").trim();
    const body = (data?.body ?? "").trim();
    if (subject.length < 3 || subject.length > 200) throw new Error("Subject must be 3–200 characters");
    if (body.length < 3 || body.length > 5000) throw new Error("Message must be 3–5000 characters");
    const pri = (data?.priority ?? "normal") as "low" | "normal" | "high" | "urgent";
    if (!["low", "normal", "high", "urgent"].includes(pri)) throw new Error("Invalid priority");
    return { subject, body, priority: pri, service_id: data?.service_id ?? null };
  })
  .handler(async ({ data, context }) => {
    const { data: t, error } = await context.supabase
      .from("support_tickets")
      .insert({
        customer_id: context.userId,
        subject: data.subject,
        priority: data.priority,
        service_id: data.service_id,
      } as any)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    const { error: mErr } = await context.supabase.from("support_messages").insert({
      ticket_id: t.id,
      sender_id: context.userId,
      body: data.body,
      is_internal: false,
    } as any);
    if (mErr) throw new Error(mErr.message);
    return { ticket_id: t.id as string };
  });

export const replySupportTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { ticket_id: string; body: string; is_internal?: boolean }) => {
    const body = (data?.body ?? "").trim();
    if (!data?.ticket_id) throw new Error("ticket_id required");
    if (body.length < 1 || body.length > 5000) throw new Error("Message must be 1–5000 characters");
    return { ticket_id: data.ticket_id, body, is_internal: !!data.is_internal };
  })
  .handler(async ({ data, context }) => {
    const admin = await isAdmin(context);
    if (data.is_internal && !admin) throw new Error("Only admins can post internal notes");
    const { error } = await context.supabase.from("support_messages").insert({
      ticket_id: data.ticket_id,
      sender_id: context.userId,
      body: data.body,
      is_internal: data.is_internal,
    } as any);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateSupportTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { ticket_id: string; status?: string; priority?: string; assigned_to?: string | null }) => data)
  .handler(async ({ data, context }) => {
    const admin = await isAdmin(context);
    const patch: Record<string, any> = {};
    if (data.status) {
      if (!["open", "pending", "resolved", "closed"].includes(data.status)) throw new Error("Invalid status");
      patch.status = data.status;
    }
    if (data.priority) {
      if (!admin) throw new Error("Only admins can change priority");
      if (!["low", "normal", "high", "urgent"].includes(data.priority)) throw new Error("Invalid priority");
      patch.priority = data.priority;
    }
    if (data.assigned_to !== undefined) {
      if (!admin) throw new Error("Only admins can assign");
      patch.assigned_to = data.assigned_to;
    }
    if (!Object.keys(patch).length) return { ok: true };
    const { error } = await context.supabase.from("support_tickets").update(patch).eq("id", data.ticket_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
