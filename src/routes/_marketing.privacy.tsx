import { createFileRoute } from "@tanstack/react-router";

const sections = [
  { h: "1. What we collect", p: "Account details you provide (name, email, phone, billing) and technical data (IP address, logs) to operate the services." },
  { h: "2. How we use it", p: "To provide services, process payments, prevent fraud, and communicate about your account. We never sell your data." },
  { h: "3. Sharing", p: "We share data only with processors necessary to operate services (payment providers, registrars) under strict confidentiality." },
  { h: "4. Retention", p: "We keep data as long as required for the service, legal obligations and dispute resolution. You may request deletion at any time." },
  { h: "5. Your rights", p: "You have rights to access, correct, export and delete your personal data. Email us to make a request." },
  { h: "6. Cookies", p: "We use essential cookies to run the site and optional analytics cookies to improve it. You can control cookies in your browser." },
];

export const Route = createFileRoute("/_marketing/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Sync & Solutions IT" },
      { name: "description", content: "How we collect, use and protect your personal data." },
      { property: "og:url", content: "/privacy" },
    ],
    links: [{ rel: "canonical", href: "/privacy" }],
  }),
  component: LegalPage,
});

function LegalPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-4xl font-black text-slate-900">Privacy Policy</h1>
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
