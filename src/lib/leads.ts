import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

export const leadSchema = z.object({
  name: z.string().trim().max(120).optional(),
  email: z.string().trim().email("Enter a valid email").max(255),
  phone: z.string().trim().max(40).optional(),
  subject: z.string().trim().max(200).optional(),
  message: z.string().trim().max(2000).optional(),
  source: z.string().trim().max(60).default("contact"),
  plan_name: z.string().trim().max(80).optional(),
});

export type LeadInput = z.infer<typeof leadSchema>;

export async function submitLead(input: LeadInput) {
  const parsed = leadSchema.parse(input);
  const { error } = await supabase.from("leads").insert({
    name: parsed.name ?? null,
    email: parsed.email,
    phone: parsed.phone ?? null,
    subject: parsed.subject ?? null,
    message: parsed.message ?? null,
    source: parsed.source,
    plan_name: parsed.plan_name ?? null,
    user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 300) : null,
  });
  if (error) throw new Error(error.message);
  // Fire-and-forget notification. Route exists but only sends if email domain is configured.
  try {
    void fetch("/api/public/hooks/notify-lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed),
      keepalive: true,
    });
  } catch {
    // no-op
  }
}
