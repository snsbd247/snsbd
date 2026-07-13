import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { PricingCard } from "@/components/marketing/pricing-card";
import { SectionHeading, CtaBand } from "@/components/marketing/section";
import { resellerPlans } from "@/content/plans";
import { useHostingPackages } from "@/hooks/use-marketing-data";
import { usePageContent } from "@/lib/page-content";

export const Route = createFileRoute("/_marketing/reseller-hosting")({
  head: () => ({
    meta: [
      { title: "Reseller Hosting with WHM & Free WHMCS — Sync & Solutions IT" },
      { name: "description", content: "Start your own hosting business with white-label WHM/cPanel, free WHMCS module and unlimited bandwidth." },
      { property: "og:title", content: "Reseller Hosting — Sync & Solutions IT" },
      { property: "og:url", content: "/reseller-hosting" },
    ],
    links: [{ rel: "canonical", href: "/reseller-hosting" }],
  }),
  component: Page,
});

function Page() {
  const { data: plans } = useHostingPackages("reseller");
  const list = plans && plans.length > 0 ? plans : resellerPlans;
  const c = usePageContent("reseller-hosting", {
    hero_title: "Start your own hosting business",
    hero_subtitle: "White-label WHM/cPanel, free WHMCS module and instant setup — everything you need to resell professionally.",
  });
  return (
    <>
      <section className="bg-gradient-to-br from-[#0B1220] to-[#0F172A] py-20 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <h1 className="text-4xl font-black sm:text-5xl">{c.hero_title}</h1>
          <p className="mt-4 text-white/70">{c.hero_subtitle}</p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <SectionHeading eyebrow="Reseller Pricing" title="Plans built for hosting entrepreneurs" />
        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {list.map((p) => <PricingCard key={p.name} plan={p} />)}
        </div>
      </section>

      <CtaBand title="Turn hosting into recurring revenue">
        <Button asChild size="lg" className="bg-emerald-500 text-[#0B1220] hover:bg-emerald-400">
          <Link to="/auth" search={{ mode: "signup" }}>Become a Reseller</Link>
        </Button>
      </CtaBand>
    </>
  );
}
