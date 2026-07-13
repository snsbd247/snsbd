import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { PricingCard } from "@/components/marketing/pricing-card";
import { SectionHeading, CtaBand } from "@/components/marketing/section";
import { webHostingPlans } from "@/content/plans";
import { useHostingPackages } from "@/hooks/use-marketing-data";
import { usePageContent } from "@/lib/page-content";
import { Check } from "lucide-react";

export const Route = createFileRoute("/_marketing/web-hosting")({
  head: () => ({
    meta: [
      { title: "Fast Web Hosting Plans in Bangladesh — Sync & Solutions IT" },
      { name: "description", content: "Reliable LiteSpeed web hosting from ৳99/mo with free SSL, daily backup and cPanel. 30-day money back guarantee." },
      { property: "og:title", content: "Web Hosting — Sync & Solutions IT" },
      { property: "og:url", content: "/web-hosting" },
    ],
    links: [{ rel: "canonical", href: "/web-hosting" }],
  }),
  component: Page,
});

const includes = [
  "LiteSpeed Web Server",
  "Free Let's Encrypt SSL",
  "Softaculous 1-click installer",
  "Free automated daily backup",
  "cPanel control panel",
  "Free website migration",
  "99.9% uptime SLA",
  "24/7 human support",
];

function Page() {
  const { data: plans } = useHostingPackages("web");
  const list = plans && plans.length > 0 ? plans : webHostingPlans;

  return (
    <>
      <section className="bg-gradient-to-br from-[#0B1220] to-[#0F172A] py-20 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <div className="inline-flex rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">Web Hosting</div>
          <h1 className="mt-4 text-4xl font-black sm:text-5xl">Blazing fast hosting from ৳99/mo</h1>
          <p className="mt-4 text-white/70">LiteSpeed + NVMe storage, free SSL, daily backups and 24/7 human support. Everything you need to launch and grow.</p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {list.map((p) => <PricingCard key={p.name} plan={p} />)}
        </div>
      </section>

      <section className="bg-slate-50 py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeading eyebrow="What's included" title="Every plan ships with everything you need" />
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {includes.map((f) => (
              <div key={f} className="flex items-start gap-2 rounded-xl bg-white p-4 shadow-sm">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                <span className="text-sm text-slate-700">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CtaBand title="Start hosting today" subtitle="30-day money-back guarantee. Free migration. Cancel anytime.">
        <Button asChild size="lg" className="bg-emerald-500 text-[#0B1220] hover:bg-emerald-400">
          <Link to="/auth" search={{ mode: "signup" }}>Get Started</Link>
        </Button>
      </CtaBand>
    </>
  );
}
