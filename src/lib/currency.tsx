import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type Currency = { code: string; symbol: string; rate_to_bdt: number };

type Ctx = {
  currency: string;
  setCurrency: (c: string) => void;
  currencies: Currency[];
  format: (bdtAmount: number) => string;
};
const CurrencyCtx = createContext<Ctx>({
  currency: "BDT",
  setCurrency: () => {},
  currencies: [{ code: "BDT", symbol: "৳", rate_to_bdt: 1 }],
  format: (n) => `৳${n.toFixed(2)}`,
});

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState("BDT");
  useEffect(() => {
    try {
      const saved = localStorage.getItem("currency");
      if (saved) setCurrencyState(saved);
    } catch {}
  }, []);
  const setCurrency = (c: string) => {
    setCurrencyState(c);
    try { localStorage.setItem("currency", c); } catch {}
  };

  const { data } = useQuery({
    queryKey: ["currencies"],
    queryFn: async () => {
      const { data, error } = await supabase.from("currencies").select("code, symbol, rate_to_bdt").eq("is_active", true);
      if (error) throw error;
      return data as Currency[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const currencies = data ?? [{ code: "BDT", symbol: "৳", rate_to_bdt: 1 }];
  const active = currencies.find((c) => c.code === currency) ?? currencies[0];
  const format = (bdt: number) => `${active.symbol}${(bdt * Number(active.rate_to_bdt)).toFixed(2)}`;

  return <CurrencyCtx.Provider value={{ currency, setCurrency, currencies, format }}>{children}</CurrencyCtx.Provider>;
}

export const useCurrency = () => useContext(CurrencyCtx);
