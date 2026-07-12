import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Lang = "en" | "bn";

const STRINGS: Record<Lang, Record<string, string>> = {
  en: {
    dashboard: "Dashboard",
    invoices: "Invoices",
    services: "Services",
    domains: "Domains",
    hosting: "Hosting",
    tickets: "Support",
    profile: "Profile",
    signOut: "Sign out",
    apiKeys: "API Keys",
    webhooks: "Webhooks",
    resellers: "Resellers",
    language: "Language",
    currency: "Currency",
    english: "English",
    bangla: "Bangla",
    save: "Save",
    cancel: "Cancel",
    create: "Create",
    delete: "Delete",
    name: "Name",
    url: "URL",
    events: "Events",
    status: "Status",
    scopes: "Scopes",
  },
  bn: {
    dashboard: "ড্যাশবোর্ড",
    invoices: "ইনভয়েস",
    services: "সার্ভিস",
    domains: "ডোমেইন",
    hosting: "হোস্টিং",
    tickets: "সাপোর্ট",
    profile: "প্রোফাইল",
    signOut: "সাইন আউট",
    apiKeys: "এপিআই কী",
    webhooks: "ওয়েবহুক",
    resellers: "রিসেলার",
    language: "ভাষা",
    currency: "মুদ্রা",
    english: "ইংরেজি",
    bangla: "বাংলা",
    save: "সংরক্ষণ",
    cancel: "বাতিল",
    create: "তৈরি",
    delete: "মুছুন",
    name: "নাম",
    url: "ইউআরএল",
    events: "ইভেন্ট",
    status: "স্ট্যাটাস",
    scopes: "স্কোপ",
  },
};

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (k: string) => string };
const I18nCtx = createContext<Ctx>({ lang: "en", setLang: () => {}, t: (k) => k });

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  useEffect(() => {
    try {
      const saved = localStorage.getItem("lang");
      if (saved === "en" || saved === "bn") setLangState(saved);
    } catch {}
  }, []);
  const setLang = (l: Lang) => {
    setLangState(l);
    try { localStorage.setItem("lang", l); } catch {}
  };
  const t = (k: string) => STRINGS[lang][k] ?? STRINGS.en[k] ?? k;
  return <I18nCtx.Provider value={{ lang, setLang, t }}>{children}</I18nCtx.Provider>;
}

export const useI18n = () => useContext(I18nCtx);
