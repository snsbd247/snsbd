import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, X, ChevronDown, Server, Globe, Cloud, Users, Mail, LifeBuoy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCompanySettings } from "@/lib/company-settings";

const hostingLinks = [
  { to: "/web-hosting", label: "Web Hosting", icon: Server, desc: "Shared cPanel hosting with SSD" },
  { to: "/bdix-hosting", label: "BDIX Hosting", icon: Cloud, desc: "Ultra-fast for Bangladesh visitors" },
  { to: "/reseller-hosting", label: "Reseller Hosting", icon: Users, desc: "Sell hosting under your brand" },
  { to: "/vps", label: "VPS Hosting", icon: Server, desc: "Dedicated resources, root access" },
];

const services = [
  { to: "/register-domain", label: "Domains" },
  { to: "/email-hosting", label: "Email Hosting" },
  { to: "/support", label: "Support" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

export function MarketingHeader() {
  const { data } = useCompanySettings();
  const [open, setOpen] = useState(false);
  const [hostingOpen, setHostingOpen] = useState(false);
  const brand = data?.company_name ?? "Sync & Solutions IT";

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0B1220]/90 backdrop-blur supports-[backdrop-filter]:bg-[#0B1220]/70">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-2 text-white">
          {data?.logo_url ? (
            <img src={data.logo_url} alt={`${brand} logo`} className="h-9 w-auto object-contain bg-transparent" />
          ) : (
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 font-black text-[#0B1220]">
              {brand.charAt(0)}
            </span>
          )}
          <span className="hidden text-base font-bold sm:inline">{brand}</span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          <div
            className="relative"
            onMouseEnter={() => setHostingOpen(true)}
            onMouseLeave={() => setHostingOpen(false)}
          >
            <button className="flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium text-white/80 hover:bg-white/5 hover:text-white">
              Hosting <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {hostingOpen && (
              <div className="absolute left-0 top-full w-[560px] rounded-2xl border border-white/10 bg-[#0F172A] p-3 shadow-2xl">
                <div className="grid grid-cols-2 gap-2">
                  {hostingLinks.map((l) => (
                    <Link
                      key={l.to}
                      to={l.to}
                      className="group flex items-start gap-3 rounded-xl p-3 hover:bg-white/5"
                    >
                      <l.icon className="mt-0.5 h-5 w-5 text-emerald-400" />
                      <div>
                        <div className="text-sm font-semibold text-white">{l.label}</div>
                        <div className="text-xs text-white/60">{l.desc}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
          {services.map((s) => (
            <Link
              key={s.to}
              to={s.to}
              className="rounded-md px-3 py-2 text-sm font-medium text-white/80 hover:bg-white/5 hover:text-white"
              activeProps={{ className: "text-emerald-400" }}
            >
              {s.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" className="hidden text-white hover:bg-white/10 hover:text-white sm:inline-flex">
            <Link to="/auth">Client Area</Link>
          </Button>
          <Button asChild className="bg-emerald-500 text-[#0B1220] hover:bg-emerald-400">
            <Link to="/auth" search={{ mode: "signup" }}>Get Started</Link>
          </Button>
          <button
            className="grid h-10 w-10 place-items-center rounded-md text-white lg:hidden"
            onClick={() => setOpen(!open)}
            aria-label="Menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-white/10 bg-[#0B1220] px-4 py-4 lg:hidden">
          <div className="flex flex-col gap-1">
            {[...hostingLinks, ...services].map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm text-white/80 hover:bg-white/5 hover:text-white"
              >
                {l.label}
              </Link>
            ))}
            <Link
              to="/auth"
              onClick={() => setOpen(false)}
              className="rounded-md px-3 py-2 text-sm text-white/80 hover:bg-white/5 hover:text-white"
            >
              Client Area
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
