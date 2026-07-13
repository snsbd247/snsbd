import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { PricingCard } from "@/components/marketing/pricing-card";
import { SectionHeading, CtaBand } from "@/components/marketing/section";
import { bdixHostingPlans } from "@/content/plans";
import { useHostingPackages } from "@/hooks/use-marketing-data";
import { usePageContent } from "@/lib/page-content";
import { Zap, Globe, Shield } from "lucide-react";

export const Route = createFileRoute("/_marketing/bdix-hosting")({
  head: () => ({
    meta: [
      { title: "BDIX Hosting Bangladesh — Ultra Fast for Local Traffic" },
      { name: "description", content: "BDIX-optimized hosting with NVMe SSD, LiteSpeed and 24/7 support. Deliver sub-second page loads to Bangladesh visitors." },
      { property: "og:title", content: "BDIX Hosting — Sync & Solutions IT" },
      { property: "og:url", content: "/bdix-hosting" },
    ],
    links: [{ rel: "canonical", href: "/bdix-hosting" }],
  }),
  component: Page,
});

function Page() {
  const { data: plans } = useHostingPackages("bdix");
  const list = plans && plans.length > 0 ? plans : bdixHostingPlans;
  return (
    <>
      <section className="bg-gradient-to-br from-[#0B1220] to-[#0F172A] py-20 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <div className="inline-flex rounded-full bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-300">BDIX Optimized</div>
          <h1 className="mt-4 text-4xl font-black sm:text-5xl">Lightning fast BDIX hosting</h1>
          <p className="mt-4 text-white/70">Peer with every major ISP in Bangladesh via BDIX and deliver sub-second page loads to your local audience.</p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-6 sm:grid-cols-3">
          {[
            { icon: Zap, title: "Sub-second loads", desc: "Direct peering with BDIX ISPs means <100ms latency across Bangladesh." },
            { icon: Globe, title: "Dual route", desc: "BDIX + international bandwidth so visitors from anywhere stay fast." },
            { icon: Shield, title: "Enterprise NVMe", desc: "NVMe SSDs and LiteSpeed cache for the fastest TTFB in the country." },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border border-slate-200 bg-white p-6">
              <f.icon className="h-6 w-6 text-emerald-500" />
              <div className="mt-3 font-bold text-slate-900">{f.title}</div>
              <p className="mt-1 text-sm text-slate-600">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-slate-50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHeading eyebrow="Pricing" title="BDIX plans for every stage" />
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {list.map((p) => <PricingCard key={p.name} plan={p} />)}
          </div>
        </div>
      </section>

      <CtaBand title="Serve Bangladesh at lightning speed">
        <Button asChild size="lg" className="bg-emerald-500 text-[#0B1220] hover:bg-emerald-400">
          <Link to="/auth" search={{ mode: "signup" }}>Get BDIX Hosting</Link>
        </Button>
      </CtaBand>
    </>
  );
}
