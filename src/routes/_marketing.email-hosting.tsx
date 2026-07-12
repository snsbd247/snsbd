import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { PricingCard } from "@/components/marketing/pricing-card";
import { SectionHeading, CtaBand } from "@/components/marketing/section";
import type { Plan } from "@/components/marketing/pricing-card";

const plans: Plan[] = [
  { name: "Email Lite", price: "৳99", period: "mo", features: ["5 Mailboxes", "5 GB per mailbox", "Webmail + IMAP/POP", "Spam & virus filter"] },
  { name: "Email Pro", price: "৳249", period: "mo", features: ["25 Mailboxes", "25 GB per mailbox", "Calendar & contacts", "Priority delivery"], featured: true, badge: "Popular" },
  { name: "Email Max", price: "৳599", period: "mo", features: ["Unlimited Mailboxes", "50 GB per mailbox", "Custom aliases", "24/7 support"] },
];

export const Route = createFileRoute("/_marketing/email-hosting")({
  head: () => ({
    meta: [
      { title: "Business Email Hosting — you@yourdomain.com" },
      { name: "description", content: "Professional email hosting with webmail, IMAP/POP, spam filtering and calendar support." },
      { property: "og:title", content: "Email Hosting — Sync & Solutions IT" },
      { property: "og:url", content: "/email-hosting" },
    ],
    links: [{ rel: "canonical", href: "/email-hosting" }],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <section className="bg-gradient-to-br from-[#0B1220] to-[#0F172A] py-20 text-white">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h1 className="text-4xl font-black sm:text-5xl">Professional business email</h1>
          <p className="mt-4 text-white/70">Look professional with you@yourdomain.com — powered by enterprise-grade infrastructure.</p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <SectionHeading eyebrow="Email Plans" title="Simple email hosting for teams" />
        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {plans.map((p) => <PricingCard key={p.name} plan={p} />)}
        </div>
      </section>

      <CtaBand title="Set up business email in minutes">
        <Button asChild size="lg" className="bg-emerald-500 text-[#0B1220] hover:bg-emerald-400">
          <Link to="/auth" search={{ mode: "signup" }}>Get Business Email</Link>
        </Button>
      </CtaBand>
    </>
  );
}
