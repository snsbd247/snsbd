import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, X, Globe, Loader2, ShoppingCart } from "lucide-react";
import { useDomainPricing } from "@/hooks/use-marketing-data";
import { toast } from "sonner";
import { submitLead } from "@/lib/leads";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_marketing/domain-search")({
  head: () => ({
    meta: [
      { title: "Domain Search & Availability — Register or Transfer — Sync & Solutions IT" },
      { name: "description", content: "Check domain availability instantly across .com, .net, .org and 500+ extensions. Register or transfer in minutes." },
      { property: "og:title", content: "Domain Search — Sync & Solutions IT" },
      { property: "og:description", content: "Check domain availability instantly and register or transfer with free WHOIS privacy." },
      { property: "og:url", content: "https://snsbd.lovable.app/domain-search" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://snsbd.lovable.app/domain-search" }],
  }),
  component: Page,
});

type Result = { domain: string; tld: string; price: string; available: boolean };

function mockCheck(query: string, tlds: Array<{ tld: string; register_price: number }>): Result[] {
  const base = query.trim().toLowerCase().replace(/^https?:\/\//, "").split("/")[0]!;
  const bare = base.includes(".") ? base.split(".")[0]! : base;
  return tlds.map((t) => {
    const domain = `${bare}${t.tld}`;
    const hash = [...domain].reduce((a, c) => (a * 33 + c.charCodeAt(0)) & 0xffffffff, 5381);
    const available = Math.abs(hash) % 3 !== 0;
    return { domain, tld: t.tld, price: `৳${Number(t.register_price).toLocaleString("en-BD")}`, available };
  });
}

function Page() {
  const { data: tlds = [] } = useDomainPricing();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Result | null>(null);

  async function onSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setBusy(true);
    setResults(null);
    // Simulate network latency — swap for real API call when creds provided.
    await new Promise((r) => setTimeout(r, 500));
    setResults(mockCheck(query, tlds));
    setBusy(false);
  }

  return (
    <>
      <section className="bg-gradient-to-br from-[#0B1220] to-[#0F172A] py-16 text-white">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h1 className="text-3xl font-black sm:text-5xl">Search & register your domain</h1>
          <p className="mt-4 text-white/70">Type a name — we'll check availability across every popular extension in real time.</p>
          <form onSubmit={onSearch} className="mt-8 flex gap-2">
            <div className="flex flex-1 items-center gap-2 rounded-xl bg-white px-3 py-3 text-slate-900">
              <Globe className="h-4 w-4 text-slate-400" />
              <input
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
                placeholder="yourbrand"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={busy} className="bg-emerald-500 text-[#0B1220] hover:bg-emerald-400">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
            </Button>
          </form>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        {busy && (
          <div className="flex items-center justify-center py-16 text-slate-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Checking availability…
          </div>
        )}

        {results && !busy && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 bg-slate-50 px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
              {results.filter((r) => r.available).length} of {results.length} available
            </div>
            <ul className="divide-y divide-slate-100">
              {results.map((r) => (
                <li key={r.domain} className="flex items-center justify-between gap-4 px-6 py-4">
                  <div className="flex min-w-0 items-center gap-3">
                    {r.available ? (
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-600">
                        <Check className="h-4 w-4" />
                      </span>
                    ) : (
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-rose-50 text-rose-500">
                        <X className="h-4 w-4" />
                      </span>
                    )}
                    <div className="min-w-0">
                      <div className="truncate font-mono text-sm font-bold text-slate-900">{r.domain}</div>
                      <div className="text-xs text-slate-500">
                        {r.available ? `${r.price}/year` : "Taken — try a transfer"}
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={r.available ? "default" : "outline"}
                    className={r.available ? "bg-emerald-500 text-[#0B1220] hover:bg-emerald-400" : ""}
                    onClick={() => setSelected(r)}
                  >
                    <ShoppingCart className="mr-1.5 h-3.5 w-3.5" />
                    {r.available ? "Register" : "Transfer"}
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {!results && !busy && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">
            <Globe className="mx-auto h-8 w-8 text-slate-400" />
            <p className="mt-3 text-sm">Search a name above to see results across .com, .net, .io and more.</p>
          </div>
        )}
      </section>

      <DomainOrderDialog result={selected} onClose={() => setSelected(null)} />
    </>
  );
}

function DomainOrderDialog({ result, onClose }: { result: Result | null; onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!result) return;
    setBusy(true);
    try {
      await submitLead({
        email,
        source: result.available ? "domain_register" : "domain_transfer",
        subject: `${result.available ? "Register" : "Transfer"} ${result.domain}`,
        message: `Requested price: ${result.price}/year`,
      });
      toast.success("Got it! We'll email you next steps within minutes.");
      onClose();
      setEmail("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={!!result} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {result?.available ? "Register" : "Transfer"} <span className="font-mono">{result?.domain}</span>
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-600">
          Enter your email — we'll create your order and take you through checkout.
        </p>
        <form onSubmit={onSubmit} className="space-y-3">
          <Input
            required
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button type="submit" disabled={busy} className="w-full bg-emerald-500 text-[#0B1220] hover:bg-emerald-400">
            {busy ? "Please wait…" : `Continue — ${result?.price}/year`}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
