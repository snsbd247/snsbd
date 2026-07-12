import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Server, Globe, Shield, Zap, Headphones, Cloud, Check, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PricingCard } from "@/components/marketing/pricing-card";
import { SectionHeading, CtaBand } from "@/components/marketing/section";
import { webHostingPlans } from "@/content/plans";

export const Route = createFileRoute("/_marketing/")({
  head: () => ({
    meta: [
      { title: "Fast Web Hosting, Domains & Cloud in Bangladesh — Sync & Solutions IT" },
      { name: "description", content: "Blazing fast BDIX & international hosting, cheap domains, VPS and reseller plans with 24/7 support. Trusted by 5,000+ customers." },
      { property: "og:title", content: "Sync & Solutions IT — Web Hosting & Domains" },
      { property: "og:description", content: "Blazing fast BDIX & international hosting, cheap domains, VPS and reseller plans with 24/7 support." },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: Home,
});

const features = [
  { icon: Zap, title: "LiteSpeed + NVMe", desc: "Up to 3× faster page loads with LiteSpeed Web Server & NVMe SSD storage." },
  { icon: Shield, title: "Free SSL & Backup", desc: "Every plan ships with free Let's Encrypt SSL and automated daily backups." },
  { icon: Cloud, title: "BDIX Optimized", desc: "Ultra-low latency for Bangladeshi visitors via our BDIX-connected network." },
  { icon: Headphones, title: "24/7 Human Support", desc: "Talk to real engineers over chat, ticket or phone — anytime you need." },
  { icon: Server, title: "99.9% Uptime SLA", desc: "Enterprise-grade infrastructure with proactive monitoring and failover." },
  { icon: Globe, title: "Global Data Centers", desc: "Deploy in Bangladesh, Singapore, USA or Europe — the choice is yours." },
];

function Home() {
  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0B1220] via-[#0F172A] to-[#0B1220] text-white">
        <div className="absolute inset-0 opacity-40 [background:radial-gradient(circle_at_15%_20%,rgba(16,185,129,0.35),transparent_40%),radial-gradient(circle_at_85%_80%,rgba(245,158,11,0.25),transparent_45%)]" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:py-28">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400" /> New: Free Migration for 2026
            </div>
            <h1 className="mt-5 text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Hosting that keeps your business{" "}
              <span className="bg-gradient-to-r from-emerald-300 to-amber-300 bg-clip-text text-transparent">fast & online</span>.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-white/70">
              Web hosting, BDIX servers, cloud VPS and domains — powered by LiteSpeed, NVMe storage and a team that actually answers.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-emerald-500 text-[#0B1220] hover:bg-emerald-400">
                <Link to="/web-hosting">See Hosting Plans <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white">
                <Link to="/register-domain">Search Domain</Link>
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-6 text-sm text-white/60">
              <div className="flex items-center gap-1"><Star className="h-4 w-4 fill-amber-400 text-amber-400" /> 4.9/5 from 1,200+ reviews</div>
              <div>5,000+ active customers</div>
            </div>
          </div>
          <div className="relative">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
              <div className="text-sm font-semibold uppercase tracking-wider text-emerald-300">Find your perfect domain</div>
              <form className="mt-4 flex gap-2" onSubmit={(e) => e.preventDefault()}>
                <div className="flex flex-1 items-center gap-2 rounded-xl bg-white px-3 py-3 text-slate-900">
                  <Globe className="h-4 w-4 text-slate-400" />
                  <input
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
                    placeholder="yourbrand.com"
                  />
                </div>
                <Button className="bg-emerald-500 text-[#0B1220] hover:bg-emerald-400">Search</Button>
              </form>
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                {[".com ৳1,150", ".net ৳1,350", ".xyz ৳299", ".dev ৳1,600", ".io ৳4,500"].map((t) => (
                  <span key={t} className="rounded-full bg-white/10 px-3 py-1 text-white/80">{t}</span>
                ))}
              </div>
              <div className="mt-6 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-amber-500/20 p-5">
                <div className="text-xs font-bold uppercase text-amber-300">Launch Offer</div>
                <div className="mt-1 text-lg font-bold">Save 40% on annual hosting</div>
                <div className="text-sm text-white/70">Use code <span className="rounded bg-white/10 px-2 py-0.5 font-mono">SNS40</span> at checkout</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <SectionHeading
          eyebrow="Why choose us"
          title="Built for speed, backed by real humans"
          subtitle="Every plan includes the tooling and expertise that once required a full DevOps team."
        />
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl border border-slate-200 bg-white p-6 transition hover:-translate-y-1 hover:shadow-lg">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
                <f.icon className="h-5 w-5" />
              </div>
              <div className="mt-4 text-lg font-bold text-slate-900">{f.title}</div>
              <p className="mt-2 text-sm text-slate-600">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHeading
            eyebrow="Pricing"
            title="Simple, honest hosting plans"
            subtitle="Start small and scale up as your traffic grows. 30-day money-back guarantee on every plan."
          />
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {webHostingPlans.map((p) => <PricingCard key={p.name} plan={p} />)}
          </div>
          <div className="mt-8 text-center">
            <Link to="/web-hosting" className="text-sm font-semibold text-emerald-600 hover:text-emerald-700">
              Compare all plans →
            </Link>
          </div>
        </div>
      </section>

      {/* SERVICES GRID */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <SectionHeading eyebrow="What we offer" title="One provider. Every service you need." />
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { to: "/web-hosting", title: "Web Hosting", desc: "LiteSpeed shared hosting from ৳99/mo", icon: Server },
            { to: "/bdix-hosting", title: "BDIX Hosting", desc: "Ultra-fast for Bangladesh traffic", icon: Cloud },
            { to: "/reseller-hosting", title: "Reseller", desc: "Sell hosting under your own brand", icon: Globe },
            { to: "/vps", title: "VPS Hosting", desc: "Root access, KVM virtualization", icon: Server },
            { to: "/register-domain", title: "Domain Names", desc: "Register or transfer .com from ৳1,150", icon: Globe },
            { to: "/email-hosting", title: "Business Email", desc: "you@yourdomain.com with webmail", icon: Cloud },
          ].map((s) => (
            <Link key={s.to} to={s.to} className="group rounded-2xl border border-slate-200 bg-white p-6 transition hover:-translate-y-1 hover:border-emerald-300 hover:shadow-lg">
              <s.icon className="h-8 w-8 text-emerald-500" />
              <div className="mt-4 text-lg font-bold text-slate-900">{s.title}</div>
              <p className="mt-1 text-sm text-slate-600">{s.desc}</p>
              <div className="mt-4 text-sm font-semibold text-emerald-600 group-hover:translate-x-1 transition-transform">
                Learn more →
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHeading eyebrow="Testimonials" title="Loved by teams big and small" />
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {[
              { name: "Rashed A.", role: "CEO, TechBazar", quote: "Migrated 12 sites in a weekend. Zero downtime, blazing speeds, and support answered every message within minutes." },
              { name: "Nafisa H.", role: "Freelance Developer", quote: "Reseller hosting has been rock-solid. I resell under my brand and my clients never even know who's behind it." },
              { name: "Imran K.", role: "E-commerce Owner", quote: "BDIX hosting cut our page load from 3.4s to 0.9s. Our conversion rate literally doubled." },
            ].map((t) => (
              <div key={t.name} className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="flex gap-0.5 text-amber-400">
                  {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}
                </div>
                <p className="mt-3 text-sm text-slate-700">"{t.quote}"</p>
                <div className="mt-4 text-sm font-bold text-slate-900">{t.name}</div>
                <div className="text-xs text-slate-500">{t.role}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CtaBand
        title="Ready to launch faster?"
        subtitle="Get started in minutes with free migration, free SSL and a 30-day money-back guarantee."
      >
        <Button asChild size="lg" className="bg-emerald-500 text-[#0B1220] hover:bg-emerald-400">
          <Link to="/auth" search={{ mode: "signup" }}>Create Account</Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white">
          <Link to="/contact">Talk to Sales</Link>
        </Button>
      </CtaBand>
    </>
  );
}
