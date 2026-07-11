import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/marketing/section";
import { tlds } from "@/content/plans";
import { Globe, Search } from "lucide-react";

export const Route = createFileRoute("/_marketing/register-domain")({
  head: () => ({
    meta: [
      { title: "Register Domain Names — .com from ৳1,150 — Sync & Solutions IT" },
      { name: "description", content: "Register or transfer domains at competitive prices. Free DNS management, WHOIS privacy and email forwarding." },
      { property: "og:title", content: "Domain Names — Sync & Solutions IT" },
      { property: "og:url", content: "https://snsbd.lovable.app/register-domain" },
    ],
    links: [{ rel: "canonical", href: "https://snsbd.lovable.app/register-domain" }],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <section className="bg-gradient-to-br from-[#0B1220] to-[#0F172A] py-20 text-white">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h1 className="text-4xl font-black sm:text-5xl">Find your perfect domain</h1>
          <p className="mt-4 text-white/70">Search 500+ extensions and register in seconds. Free DNS, forwarding and WHOIS privacy included.</p>
          <form className="mt-8 flex gap-2" onSubmit={(e) => e.preventDefault()}>
            <div className="flex flex-1 items-center gap-2 rounded-xl bg-white px-3 py-3 text-slate-900">
              <Globe className="h-4 w-4 text-slate-400" />
              <input className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400" placeholder="yourbrand.com" />
            </div>
            <Button className="bg-emerald-500 text-[#0B1220] hover:bg-emerald-400">
              <Search className="mr-2 h-4 w-4" /> Search
            </Button>
          </form>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <SectionHeading eyebrow="TLD Pricing" title="Competitive prices on every extension" />
        <div className="mt-10 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-3">TLD</th>
                <th className="px-6 py-3">Register</th>
                <th className="px-6 py-3">Renew</th>
                <th className="px-6 py-3">Transfer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tlds.map((t) => (
                <tr key={t.tld} className="hover:bg-slate-50">
                  <td className="px-6 py-3 font-bold text-slate-900">{t.tld}</td>
                  <td className="px-6 py-3 text-emerald-600 font-semibold">{t.register}</td>
                  <td className="px-6 py-3 text-slate-700">{t.renew}</td>
                  <td className="px-6 py-3 text-slate-700">{t.transfer}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
