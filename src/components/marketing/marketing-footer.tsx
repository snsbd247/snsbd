import { Link } from "@tanstack/react-router";
import { Facebook, Twitter, Linkedin, Youtube, Mail, Phone, MapPin } from "lucide-react";
import { useCompanySettings } from "@/lib/company-settings";

const cols = [
  {
    title: "Hosting",
    links: [
      { to: "/web-hosting", label: "Web Hosting" },
      { to: "/bdix-hosting", label: "BDIX Hosting" },
      { to: "/reseller-hosting", label: "Reseller Hosting" },
      { to: "/vps", label: "VPS Hosting" },
      { to: "/email-hosting", label: "Email Hosting" },
    ],
  },
  {
    title: "Company",
    links: [
      { to: "/about", label: "About Us" },
      { to: "/contact", label: "Contact" },
      { to: "/support", label: "Support Center" },
      { to: "/domains", label: "Domain Search" },
    ],
  },
  {
    title: "Legal",
    links: [
      { to: "/terms", label: "Terms of Service" },
      { to: "/privacy", label: "Privacy Policy" },
      { to: "/refund", label: "Refund Policy" },
    ],
  },
] as const;

export function MarketingFooter() {
  const { data } = useCompanySettings();
  const brand = data?.company_name ?? "Sync & Solutions IT";
  const year = new Date().getFullYear();

  return (
    <footer className="bg-[#0B1220] text-white/70">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2 text-white">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 font-black text-[#0B1220]">
                {brand.charAt(0)}
              </span>
              <span className="text-base font-bold">{brand}</span>
            </div>
            <p className="mt-4 max-w-sm text-sm">
              Reliable web hosting, domains and cloud services trusted by businesses and creators across Bangladesh.
            </p>
            <div className="mt-5 space-y-2 text-sm">
              {data?.support_email && (
                <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-emerald-400" /> {data.support_email}</div>
              )}
              {data?.support_phone && (
                <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-emerald-400" /> {data.support_phone}</div>
              )}
              {data?.address && (
                <div className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 text-emerald-400" /> {data.address}</div>
              )}
            </div>
          </div>
          {cols.map((c) => (
            <div key={c.title}>
              <div className="text-sm font-semibold uppercase tracking-wider text-white">{c.title}</div>
              <ul className="mt-4 space-y-2 text-sm">
                {c.links.map((l) => (
                  <li key={l.to}>
                    <Link to={l.to} className="hover:text-emerald-400">{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 text-xs sm:flex-row">
          <div>© {year} {brand}. All rights reserved.</div>
          <div className="flex gap-3">
            <a href="#" aria-label="Facebook" className="hover:text-white"><Facebook className="h-4 w-4" /></a>
            <a href="#" aria-label="Twitter" className="hover:text-white"><Twitter className="h-4 w-4" /></a>
            <a href="#" aria-label="LinkedIn" className="hover:text-white"><Linkedin className="h-4 w-4" /></a>
            <a href="#" aria-label="Youtube" className="hover:text-white"><Youtube className="h-4 w-4" /></a>
          </div>
        </div>
      </div>
    </footer>
  );
}
