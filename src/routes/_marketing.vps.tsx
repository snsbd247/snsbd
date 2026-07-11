import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { PricingCard } from "@/components/marketing/pricing-card";
import { SectionHeading, CtaBand } from "@/components/marketing/section";
import { vpsPlans } from "@/content/plans";

export const Route = createFileRoute("/_marketing/vps")({
  head: () => ({
    meta: [
      { title: "Cloud VPS Hosting with Root Access — Sync & Solutions IT" },
      { name: "description", content: "KVM-based cloud VPS with NVMe storage, root access, and dedicated resources. Deploy in minutes." },
      { property: "og:title", content: "VPS Hosting — Sync & Solutions IT" },
      { property: "og:url", content: "https://snsbd.lovable.app/vps" },
    ],
    links: [{ rel: "canonical", href: "https://snsbd.lovable.app/vps" }],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <section className="bg-gradient-to-br from-[#0B1220] to-[#0F172A] py-20 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <h1 className="text-4xl font-black sm:text-5xl">Cloud VPS with full root access</h1>
          <p className="mt-4 text-white/70">KVM virtualization, NVMe storage, instant deploy and dedicated resources — all backed by 24/7 support.</p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <SectionHeading eyebrow="VPS Pricing" title="Scalable plans for every workload" />
        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {vpsPlans.map((p) => <PricingCard key={p.name} plan={p} />)}
        </div>
      </section>

      <CtaBand title="Deploy your VPS in under a minute">
        <Button asChild size="lg" className="bg-emerald-500 text-[#0B1220] hover:bg-emerald-400">
          <Link to="/auth" search={{ mode: "signup" }}>Order VPS</Link>
        </Button>
      </CtaBand>
    </>
  );
}
