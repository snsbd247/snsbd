import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/**
 * Namecheap XML API wrapper.
 * Requires secrets:
 *  - NAMECHEAP_API_USER
 *  - NAMECHEAP_API_KEY
 *  - NAMECHEAP_USERNAME
 *  - NAMECHEAP_CLIENT_IP    (whitelisted in Namecheap dashboard)
 *  - NAMECHEAP_SANDBOX      ("true" for sandbox, else production)
 */

function ncBaseUrl() {
  const sandbox = (process.env.NAMECHEAP_SANDBOX ?? "false").toLowerCase() === "true";
  return sandbox ? "https://api.sandbox.namecheap.com/xml.response" : "https://api.namecheap.com/xml.response";
}

function ncCreds() {
  const ApiUser = process.env.NAMECHEAP_API_USER;
  const ApiKey = process.env.NAMECHEAP_API_KEY;
  const UserName = process.env.NAMECHEAP_USERNAME ?? ApiUser;
  const ClientIp = process.env.NAMECHEAP_CLIENT_IP;
  if (!ApiUser || !ApiKey || !UserName || !ClientIp) {
    throw new Error("Namecheap API credentials are missing. Configure NAMECHEAP_* secrets.");
  }
  return { ApiUser, ApiKey, UserName, ClientIp };
}

async function ncCall(command: string, params: Record<string, string> = {}) {
  const creds = ncCreds();
  const qs = new URLSearchParams({ ...creds, Command: command, ...params });
  const res = await fetch(`${ncBaseUrl()}?${qs.toString()}`, { method: "GET" });
  const xml = await res.text();
  if (!res.ok) throw new Error(`Namecheap HTTP ${res.status}: ${xml.slice(0, 300)}`);
  const status = /<ApiResponse[^>]*Status="([^"]+)"/i.exec(xml)?.[1] ?? "";
  if (status.toUpperCase() !== "OK") {
    const errMatch = /<Errors>([\s\S]*?)<\/Errors>/i.exec(xml)?.[1] ?? "";
    const msg = /<Error[^>]*>([^<]+)</i.exec(errMatch)?.[1] ?? "Namecheap API error";
    throw new Error(msg);
  }
  return xml;
}

function attr(tag: string, name: string): string | null {
  const re = new RegExp(`${name}="([^"]*)"`, "i");
  return re.exec(tag)?.[1] ?? null;
}

export type DomainCheckResult = {
  domain: string;
  available: boolean;
  premium: boolean;
  premiumPrice?: number;
  errorNo?: string;
};

// -------- Public: bulk availability check (no auth so marketing search works) --------
export const checkDomains = createServerFn({ method: "POST" })
  .inputValidator((input: { domains: string[] }) => {
    return z.object({
      domains: z.array(z.string().min(3).max(255)).min(1).max(50),
    }).parse(input);
  })
  .handler(async ({ data }) => {
    // Strip protocol/paths defensively; keep only bare hosts with a dot.
    const clean = Array.from(new Set(
      data.domains
        .map((d) => d.trim().toLowerCase().replace(/^https?:\/\//, "").split("/")[0]!)
        .filter((d) => d.includes(".")),
    ));
    if (clean.length === 0) return { results: [] as DomainCheckResult[] };

    const xml = await ncCall("namecheap.domains.check", { DomainList: clean.join(",") });
    const results: DomainCheckResult[] = [];
    const tagRe = /<DomainCheckResult\b[^\/>]*\/?>/gi;
    let m: RegExpExecArray | null;
    while ((m = tagRe.exec(xml))) {
      const tag = m[0];
      const domain = attr(tag, "Domain")?.toLowerCase();
      if (!domain) continue;
      results.push({
        domain,
        available: (attr(tag, "Available") ?? "").toLowerCase() === "true",
        premium: (attr(tag, "IsPremiumName") ?? "").toLowerCase() === "true",
        premiumPrice: Number(attr(tag, "PremiumRegistrationPrice") ?? "") || undefined,
        errorNo: attr(tag, "ErrorNo") ?? undefined,
      });
    }
    return { results };
  });

// -------- Admin: register a domain via Namecheap --------
type Contact = {
  FirstName: string; LastName: string; Address1: string; City: string;
  StateProvince: string; PostalCode: string; Country: string;
  Phone: string; EmailAddress: string; OrganizationName?: string;
};

function contactParams(prefix: "Registrant" | "Tech" | "Admin" | "AuxBilling", c: Contact) {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(c)) if (v) out[`${prefix}${k}`] = String(v);
  return out;
}

async function loadDefaultContact(supabase: any, customerId: string | null): Promise<Contact> {
  const [{ data: cs }, prof] = await Promise.all([
    supabase.from("company_settings").select("*").eq("id", 1).maybeSingle(),
    customerId
      ? supabase.from("profiles").select("*").eq("id", customerId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const p = prof?.data ?? {};
  const s = cs ?? {};
  const fullName: string = p.full_name || s.company_name || "Domain Owner";
  const [first, ...rest] = fullName.trim().split(/\s+/);
  const last = rest.join(" ") || first;
  const phoneRaw = String(p.phone || s.phone || "+8801700000000").replace(/[^\d+]/g, "");
  const phone = phoneRaw.startsWith("+") ? `+${phoneRaw.slice(1, 4)}.${phoneRaw.slice(4)}` : `+880.${phoneRaw.replace(/^0/, "")}`;
  return {
    FirstName: first || "Domain",
    LastName: last,
    Address1: p.address || s.address || "N/A",
    City: "Dhaka",
    StateProvince: "Dhaka",
    PostalCode: "1200",
    Country: "BD",
    Phone: phone,
    EmailAddress: p.email || s.email || "admin@example.com",
    OrganizationName: p.company || s.company_name || undefined,
  };
}

export const registerDomainNamecheap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { domain: string; years?: number; serviceId?: string; customerId?: string | null }) => {
    return z.object({
      domain: z.string().regex(/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i),
      years: z.number().int().min(1).max(10).optional(),
      serviceId: z.string().uuid().optional(),
      customerId: z.string().uuid().nullable().optional(),
    }).parse(input);
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Admins only");

    const years = data.years ?? 1;
    const domain = data.domain.toLowerCase();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const logEvent = async (status: string, message: string, metadata?: Record<string, unknown>) => {
      if (!data.serviceId) return;
      await supabaseAdmin.from("service_events").insert({
        service_id: data.serviceId, status, message, actor_id: userId, metadata: (metadata ?? null) as never,
      });
    };

    if (data.serviceId) {
      await supabaseAdmin.from("services").update({ provisioning_status: "processing", registrar: "Namecheap" }).eq("id", data.serviceId);
      await logEvent("processing", `Sending registration request to Namecheap for ${domain} (${years}y)`);
    }

    try {
      const contact = await loadDefaultContact(supabase, data.customerId ?? null);
      const params: Record<string, string> = {
        DomainName: domain,
        Years: String(years),
        AddFreeWhoisguard: "yes",
        WGEnabled: "yes",
        ...contactParams("Registrant", contact),
        ...contactParams("Tech", contact),
        ...contactParams("Admin", contact),
        ...contactParams("AuxBilling", contact),
      };
      const xml = await ncCall("namecheap.domains.create", params);
      const registered = /Registered="true"/i.test(xml);
      const orderId = /OrderID="([^"]+)"/i.exec(xml)?.[1] ?? null;
      const chargedAmount = Number(/ChargedAmount="([^"]+)"/i.exec(xml)?.[1] ?? "") || null;

      if (!registered) throw new Error("Namecheap did not confirm registration");

      if (data.serviceId) {
        const purchase = new Date();
        const expiry = new Date(purchase);
        expiry.setFullYear(expiry.getFullYear() + years);
        await supabaseAdmin.from("services").update({
          provisioning_status: "active",
          status: "active",
          registrar_order_id: orderId,
          registrar_meta: { chargedAmount, years, registeredAt: purchase.toISOString() },
          purchase_date: purchase.toISOString().slice(0, 10),
          expiry_date: expiry.toISOString().slice(0, 10),
          details: `Namecheap Order #${orderId ?? "—"}`,
        }).eq("id", data.serviceId);
        await logEvent("active", `Domain registered${orderId ? ` (Namecheap Order #${orderId})` : ""}`, { orderId, chargedAmount });
      }

      return { ok: true, orderId, chargedAmount };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (data.serviceId) {
        await supabaseAdmin.from("services").update({ provisioning_status: "failed" }).eq("id", data.serviceId);
        await logEvent("failed", `Registration failed: ${message}`);
      }
      throw err;
    }
  });

