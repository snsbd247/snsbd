import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type LogoStyle = "plain" | "stroke" | "shadow" | "badge";

export interface InvoiceTheme {
  primary: string;
  accent: string;
  textOnPrimary: string;
  fontHeading: string;
  fontBody: string;
  logoStyle: LogoStyle;
  showBackground: boolean;
  backgroundUrl?: string | null;
  backgroundOpacity: number;
}

export const DEFAULT_THEME: InvoiceTheme = {
  primary: "#c0392b",
  accent: "#1f1f1f",
  textOnPrimary: "#ffffff",
  fontHeading: "Inter",
  fontBody: "Inter",
  logoStyle: "shadow",
  showBackground: false,
  backgroundOpacity: 0.08,
};

export const FONT_PAIRS = [
  { heading: "Inter", body: "Inter", label: "Inter (Modern)" },
  { heading: "Poppins", body: "Inter", label: "Poppins + Inter" },
  { heading: "Playfair Display", body: "Inter", label: "Playfair + Inter" },
  { heading: "Bebas Neue", body: "Roboto", label: "Bebas + Roboto" },
  { heading: "Merriweather", body: "Inter", label: "Merriweather + Inter" },
] as const;

export const LOGO_STYLES: { value: LogoStyle; label: string }[] = [
  { value: "plain", label: "Plain" },
  { value: "stroke", label: "White stroke" },
  { value: "shadow", label: "Drop shadow" },
  { value: "badge", label: "Rounded badge" },
];

export interface InvoiceTemplate {
  id: string;
  template_key: string;
  name: string;
  description: string | null;
  theme: Partial<InvoiceTheme>;
  is_default: boolean;
  sort_order: number;
}

export function useInvoiceTemplates() {
  return useQuery({
    queryKey: ["invoice_templates"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoice_templates" as any)
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as unknown as InvoiceTemplate[];
    },
  });
}

/** Merge template theme ← company override ← per-invoice override. */
export function resolveTheme(
  templates: InvoiceTemplate[] | undefined,
  companyTemplateKey: string | null | undefined,
  companyOverride: Partial<InvoiceTheme> | null | undefined,
  companyLogoStyle: string | null | undefined,
  companyBackgroundUrl: string | null | undefined,
  invoiceTemplateKey?: string | null,
  invoiceOverride?: Partial<InvoiceTheme> | null,
): InvoiceTheme {
  const key = invoiceTemplateKey || companyTemplateKey || "classic-red";
  const tpl = templates?.find((t) => t.template_key === key)?.theme ?? {};
  const merged: InvoiceTheme = {
    ...DEFAULT_THEME,
    ...tpl,
    ...(companyOverride ?? {}),
    ...(companyLogoStyle ? { logoStyle: companyLogoStyle as LogoStyle } : {}),
    ...(companyBackgroundUrl ? { backgroundUrl: companyBackgroundUrl, showBackground: true } : {}),
    ...(invoiceOverride ?? {}),
  };
  return merged;
}

export function logoFilter(style: LogoStyle): string {
  switch (style) {
    case "stroke":
      return "drop-shadow(0 0 0.5px #fff) drop-shadow(0 0 0.5px #fff) drop-shadow(0 0 0.5px #fff) drop-shadow(0 0 0.5px #fff)";
    case "shadow":
      return "drop-shadow(0 2px 3px rgba(0,0,0,0.55)) drop-shadow(0 0 6px rgba(0,0,0,0.35))";
    case "badge":
    case "plain":
    default:
      return "none";
  }
}
