/**
 * Server-only Namecheap domain renewal helper.
 * Calls namecheap.domains.renew for 1 year.
 */

function baseUrl() {
  const sandbox = (process.env.NAMECHEAP_SANDBOX ?? "false").toLowerCase() === "true";
  return sandbox ? "https://api.sandbox.namecheap.com/xml.response" : "https://api.namecheap.com/xml.response";
}

function creds() {
  const ApiUser = process.env.NAMECHEAP_API_USER;
  const ApiKey = process.env.NAMECHEAP_API_KEY;
  const UserName = process.env.NAMECHEAP_USERNAME ?? ApiUser;
  const ClientIp = process.env.NAMECHEAP_CLIENT_IP;
  if (!ApiUser || !ApiKey || !UserName || !ClientIp) throw new Error("Namecheap secrets missing");
  return { ApiUser, ApiKey, UserName, ClientIp };
}

export async function renewDomainNamecheap(domain: string, years = 1): Promise<{
  ok: boolean; expiry?: string; orderId?: string; error?: string;
}> {
  try {
    const c = creds();
    const [sld, ...rest] = domain.trim().toLowerCase().split(".");
    const tld = rest.join(".");
    if (!sld || !tld) return { ok: false, error: "Invalid domain" };
    const qs = new URLSearchParams({
      ...c, Command: "namecheap.domains.renew",
      DomainName: domain, Years: String(years),
    });
    const res = await fetch(`${baseUrl()}?${qs.toString()}`);
    const xml = await res.text();
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const status = /<ApiResponse[^>]*Status="([^"]+)"/i.exec(xml)?.[1] ?? "";
    if (status.toUpperCase() !== "OK") {
      const err = /<Error[^>]*>([^<]+)</i.exec(xml)?.[1] ?? "Namecheap error";
      return { ok: false, error: err };
    }
    const orderId = /OrderID="(\d+)"/i.exec(xml)?.[1];
    const expIso = /DomainDetails>[\s\S]*?ExpiredDate>([^<]+)</i.exec(xml)?.[1]
      ?? /DomainRenewResult[^>]*ExpiredDate="([^"]+)"/i.exec(xml)?.[1];
    let expiry: string | undefined;
    if (expIso) {
      const d = new Date(expIso);
      if (!isNaN(d.getTime())) expiry = d.toISOString().slice(0, 10);
    }
    return { ok: true, orderId, expiry };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? String(e) };
  }
}
