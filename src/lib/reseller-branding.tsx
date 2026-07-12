import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getBrandingByHost } from "@/lib/branding.functions";

type Branding = {
  company_name?: string | null;
  logo_url?: string | null;
  primary_color?: string | null;
  support_email?: string | null;
} | null;

const Ctx = createContext<Branding>(null);

export function ResellerBrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<Branding>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const host = window.location.host;
    getBrandingByHost({ data: { host } })
      .then((r) => setBranding(r.branding ?? null))
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (!branding?.primary_color || typeof document === "undefined") return;
    document.documentElement.style.setProperty("--brand-primary", branding.primary_color);
  }, [branding?.primary_color]);
  return <Ctx.Provider value={branding}>{children}</Ctx.Provider>;
}

export function useResellerBranding() { return useContext(Ctx); }
