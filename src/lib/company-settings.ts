import { useQuery } from "@tanstack/react-query";
import { db } from "@/lib/db-shim";

export type CompanySettings = {
  id: boolean;
  company_name: string;
  logo_url: string | null;
  favicon_url: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  facebook_url: string | null;
  website: string | null;
  footer_copyright: string | null;
  late_fee_percent: number;
};

export const COMPANY_DEFAULTS: CompanySettings = {
  id: true,
  company_name: "Sync & Solutions IT",
  logo_url: null,
  favicon_url: null,
  email: null,
  phone: null,
  address: "Bangladesh",
  facebook_url: null,
  website: null,
  footer_copyright: null,
  late_fee_percent: 2,
};

export function useCompanySettings() {
  return useQuery({
    queryKey: ["company_settings"],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<CompanySettings> => {
      const { data } = await db.from("company_settings").select("*").maybeSingle();
      return (data as CompanySettings) ?? COMPANY_DEFAULTS;
    },
  });
}

const ones = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const tens = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

function below1000(n: number): string {
  if (n === 0) return "";
  if (n < 20) return ones[n];
  if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
  return ones[Math.floor(n / 100)] + " hundred" + (n % 100 ? " " + below1000(n % 100) : "");
}

// Indian numbering (lakh/crore) to fit BDT common usage
export function amountInWords(num: number): string {
  const n = Math.floor(Math.abs(num));
  if (n === 0) return "zero";
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const rest = n % 1000;
  const parts = [];
  if (crore) parts.push(below1000(crore) + " crore");
  if (lakh) parts.push(below1000(lakh) + " lakh");
  if (thousand) parts.push(below1000(thousand) + " thousand");
  if (rest) parts.push(below1000(rest));
  const words = parts.join(" ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
