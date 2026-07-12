import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Plan } from "@/components/marketing/pricing-card";

type HostingPackage = {
  id: string;
  name: string;
  tagline: string | null;
  price: number;
  billing_cycle: string;
  disk_space: string | null;
  bandwidth: string | null;
  features: string[];
  featured: boolean;
  badge: string | null;
  category: string;
  is_active: boolean;
  sort_order: number;
};

export function useHostingPackages(category: string) {
  return useQuery({
    queryKey: ["marketing_packages", category],
    staleTime: 60_000,
    queryFn: async (): Promise<Plan[]> => {
      const { data } = await (supabase as any)
        .from("hosting_packages")
        .select("*")
        .eq("is_active", true)
        .eq("category", category)
        .order("sort_order");
      return ((data ?? []) as HostingPackage[]).map((p) => ({
        name: p.name,
        tagline: p.tagline ?? undefined,
        price: `৳${Number(p.price).toLocaleString("en-BD")}`,
        period: p.billing_cycle === "monthly" ? "mo" : p.billing_cycle === "yearly" ? "yr" : p.billing_cycle,
        features: [
          ...(p.disk_space ? [`${p.disk_space} SSD Storage`] : []),
          ...(p.bandwidth ? [`${p.bandwidth} Bandwidth`] : []),
          ...(Array.isArray(p.features) ? p.features : []),
        ],
        featured: !!p.featured,
        badge: p.badge ?? undefined,
        packageId: p.id,
      }));
    },
  });
}

export function useDomainPricing() {
  return useQuery({
    queryKey: ["domain_pricing"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("domain_pricing")
        .select("tld, register_price, renew_price, transfer_price")
        .eq("is_active", true)
        .order("sort_order");
      return (data ?? []) as Array<{ tld: string; register_price: number; renew_price: number; transfer_price: number }>;
    },
  });
}
