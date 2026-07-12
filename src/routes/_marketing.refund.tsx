import { createFileRoute } from "@tanstack/react-router";

const sections = [
  { h: "30-day money-back guarantee", p: "New shared hosting plans are eligible for a full refund within 30 days of purchase — no questions asked." },
  { h: "Non-refundable items", p: "Domain registrations, SSL certificates, dedicated IP addresses, VPS setup fees and third-party add-ons are non-refundable." },
  { h: "How to request a refund", p: "Open a ticket from your client area within the eligibility window and our team will process it within 5 business days." },
  { h: "Renewals", p: "Refunds on renewals are considered case-by-case if requested within 7 days of the renewal charge." },
  { h: "Chargebacks", p: "Please contact us before initiating a chargeback — we resolve almost every issue directly and quickly." },
];

export const Route = createFileRoute("/_marketing/refund")({
  head: () => ({
    meta: [
      { title: "Refund Policy — Sync & Solutions IT" },
      { name: "description", content: "Our 30-day money-back guarantee and refund terms explained." },
      { property: "og:url", content: "/refund" },
    ],
    links: [{ rel: "canonical", href: "/refund" }],
  }),
  component: LegalPage,
});

function LegalPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-4xl font-black text-slate-900">Refund Policy</h1>
      <p className="mt-2 text-sm text-slate-500">Last updated: January 2026</p>
      <div className="mt-10 space-y-8">
        {sections.map((s) => (
          <div key={s.h}>
            <h2 className="text-lg font-bold text-slate-900">{s.h}</h2>
            <p className="mt-2 text-sm text-slate-600">{s.p}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
