import { createFileRoute } from "@tanstack/react-router";

const sections = [
  { h: "1. Acceptance", p: "By using our services, you agree to these Terms of Service. If you do not agree, please do not use the services." },
  { h: "2. Service Description", p: "We provide web hosting, domain registration, VPS and related services. Service specifications are described on our website." },
  { h: "3. Payment & Renewal", p: "All services renew automatically unless cancelled. Invoices are due on the date shown. Overdue invoices incur a late fee configured by us." },
  { h: "4. Acceptable Use", p: "You may not use our services for illegal activity, spam, phishing, malware distribution or any content that infringes rights of others." },
  { h: "5. Uptime & SLA", p: "We target 99.9% uptime. If we fall short, credits may be issued per our SLA. See our website for details." },
  { h: "6. Termination", p: "We may suspend or terminate services for violations of these terms. Data may be deleted 30 days after termination." },
  { h: "7. Liability", p: "Our liability is limited to the amount you paid for the service in the preceding 3 months. We are not liable for indirect damages." },
  { h: "8. Changes", p: "We may update these terms from time to time. Continued use of the services constitutes acceptance." },
];

export const Route = createFileRoute("/_marketing/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Sync & Solutions IT" },
      { name: "description", content: "Our terms of service, acceptable use policy and service level agreement." },
      { property: "og:url", content: "/terms" },
    ],
    links: [{ rel: "canonical", href: "/terms" }],
  }),
  component: LegalPage,
});

function LegalPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-4xl font-black text-slate-900">Terms of Service</h1>
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
