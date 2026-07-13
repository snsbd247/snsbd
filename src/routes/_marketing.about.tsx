import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { SectionHeading, CtaBand } from "@/components/marketing/section";
import { usePageContent } from "@/lib/page-content";
import { Users, Target, Award, Heart } from "lucide-react";

export const Route = createFileRoute("/_marketing/about")({
  head: () => ({
    meta: [
      { title: "About Us — Sync & Solutions IT" },
      { name: "description", content: "Learn about our mission to power Bangladesh's digital economy with reliable hosting and honest service." },
      { property: "og:title", content: "About — Sync & Solutions IT" },
      { property: "og:url", content: "/about" },
    ],
    links: [{ rel: "canonical", href: "/about" }],
  }),
  component: Page,
});

const values = [
  { icon: Target, title: "Reliability first", desc: "99.9% uptime isn't marketing — it's an engineering promise backed by real infrastructure." },
  { icon: Users, title: "Human support", desc: "Every ticket is answered by a real engineer, not a script or a bot." },
  { icon: Award, title: "Honest pricing", desc: "No surprise renewal hikes, no hidden fees — the price you see is the price you pay." },
  { icon: Heart, title: "Community focus", desc: "We invest back into Bangladesh's tech community through training, sponsorships and mentorship." },
];

function Page() {
  return (
    <>
      <section className="bg-gradient-to-br from-[#0B1220] to-[#0F172A] py-20 text-white">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <div className="inline-flex rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">About Us</div>
          <h1 className="mt-4 text-4xl font-black sm:text-5xl">Powering Bangladesh's digital economy</h1>
          <p className="mt-4 text-white/70">Since day one, our mission has been simple: give every business in Bangladesh the infrastructure and support it needs to thrive online.</p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-3">
          {[
            { n: "5,000+", l: "Active customers" },
            { n: "50,000+", l: "Websites hosted" },
            { n: "99.99%", l: "Network uptime" },
          ].map((s) => (
            <div key={s.l} className="rounded-3xl border border-slate-200 bg-white p-8 text-center">
              <div className="text-4xl font-black text-emerald-600">{s.n}</div>
              <div className="mt-2 text-sm text-slate-600">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-slate-50 py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeading eyebrow="Our Values" title="What we stand for" />
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {values.map((v) => (
              <div key={v.title} className="rounded-2xl border border-slate-200 bg-white p-6">
                <v.icon className="h-6 w-6 text-emerald-500" />
                <div className="mt-3 text-lg font-bold text-slate-900">{v.title}</div>
                <p className="mt-1 text-sm text-slate-600">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CtaBand title="Ready to join thousands of happy customers?">
        <Button asChild size="lg" className="bg-emerald-500 text-[#0B1220] hover:bg-emerald-400">
          <Link to="/auth" search={{ mode: "signup" }}>Get Started</Link>
        </Button>
      </CtaBand>
    </>
  );
}
