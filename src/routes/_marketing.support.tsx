import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/marketing/section";
import { LifeBuoy, BookOpen, MessageCircle, Ticket } from "lucide-react";

export const Route = createFileRoute("/_marketing/support")({
  head: () => ({
    meta: [
      { title: "Support Center — Sync & Solutions IT" },
      { name: "description", content: "Knowledge base, tutorials, live chat and 24/7 ticket support to help you succeed." },
      { property: "og:title", content: "Support — Sync & Solutions IT" },
      { property: "og:url", content: "/support" },
    ],
    links: [{ rel: "canonical", href: "/support" }],
  }),
  component: Page,
});

const faqs = [
  { q: "How fast is your support response?", a: "Average response time is under 5 minutes for chat and under 30 minutes for tickets — 24/7, every day of the year." },
  { q: "Do you help migrate my site from another host?", a: "Yes, free migration is included with every hosting plan. Just open a ticket after signup and our team handles the rest." },
  { q: "What's your uptime guarantee?", a: "We guarantee 99.9% uptime with an SLA. If we ever fall short, you're automatically credited for the downtime." },
  { q: "Can I upgrade my plan later?", a: "Absolutely. Upgrade or downgrade any time from your client area — you only pay the prorated difference." },
  { q: "Do you offer a money-back guarantee?", a: "Yes, 30-day money-back on all hosting plans. No questions asked." },
];

function Page() {
  return (
    <>
      <section className="bg-gradient-to-br from-[#0B1220] to-[#0F172A] py-20 text-white">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h1 className="text-4xl font-black sm:text-5xl">How can we help?</h1>
          <p className="mt-4 text-white/70">Browse our knowledge base, chat with support or open a ticket — we're online 24/7.</p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: BookOpen, title: "Knowledge Base", desc: "Step-by-step guides" },
            { icon: MessageCircle, title: "Live Chat", desc: "Instant replies" },
            { icon: Ticket, title: "Submit Ticket", desc: "24/7 response" },
            { icon: LifeBuoy, title: "Emergency", desc: "Priority phone line" },
          ].map((s) => (
            <div key={s.title} className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
              <s.icon className="mx-auto h-8 w-8 text-emerald-500" />
              <div className="mt-3 font-bold text-slate-900">{s.title}</div>
              <div className="text-sm text-slate-600">{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-slate-50 py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <SectionHeading eyebrow="FAQ" title="Frequently asked questions" />
          <div className="mt-10 space-y-3">
            {faqs.map((f) => (
              <details key={f.q} className="group rounded-2xl border border-slate-200 bg-white p-5 open:shadow-md">
                <summary className="cursor-pointer list-none text-sm font-bold text-slate-900 marker:hidden">
                  {f.q}
                </summary>
                <p className="mt-3 text-sm text-slate-600">{f.a}</p>
              </details>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Button asChild className="bg-emerald-500 text-[#0B1220] hover:bg-emerald-400">
              <Link to="/contact">Contact Support</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
