import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Mail, Phone, MapPin, MessageCircle } from "lucide-react";
import { useCompanySettings } from "@/lib/company-settings";
import { submitLead } from "@/lib/leads";
import { toast } from "sonner";


export const Route = createFileRoute("/_marketing/contact")({
  head: () => ({
    meta: [
      { title: "Contact Us — Sync & Solutions IT" },
      { name: "description", content: "Get in touch with our sales and support team. We respond within minutes, 24/7." },
      { property: "og:title", content: "Contact — Sync & Solutions IT" },
      { property: "og:url", content: "/contact" },
    ],
    links: [{ rel: "canonical", href: "/contact" }],
  }),
  component: Page,
});

function Page() {
  const { data } = useCompanySettings();
  return (
    <>
      <section className="bg-gradient-to-br from-[#0B1220] to-[#0F172A] py-20 text-white">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h1 className="text-4xl font-black sm:text-5xl">Let's talk</h1>
          <p className="mt-4 text-white/70">Sales, support or just a friendly hello — we'd love to hear from you.</p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <div className="space-y-5">
            {[
              { icon: Mail, label: "Email", value: data?.email ?? "hello@snsbd.com" },
              { icon: Phone, label: "Phone", value: data?.phone ?? "+880 1234 567890" },
              { icon: MessageCircle, label: "Live Chat", value: "Available 24/7 in your client area" },
              { icon: MapPin, label: "Office", value: data?.address ?? "Dhaka, Bangladesh" },
            ].map((c) => (
              <div key={c.label} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-5">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
                  <c.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold uppercase text-slate-500">{c.label}</div>
                  <div className="mt-0.5 truncate text-sm font-medium text-slate-900">{c.value}</div>
                </div>
              </div>
            ))}
          </div>
          <ContactForm />
        </div>
      </section>
    </>
  );
}

function ContactForm() {
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await submitLead({ ...form, source: "contact_form" });
      toast.success("Thanks — we'll get back to you shortly.");
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="rounded-3xl border border-slate-200 bg-white p-6" onSubmit={onSubmit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">
          Name
          <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Email
          <input required type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
        </label>
      </div>
      <label className="mt-4 block text-sm font-medium text-slate-700">
        Subject
        <input required value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
      </label>
      <label className="mt-4 block text-sm font-medium text-slate-700">
        Message
        <textarea required rows={5} value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
      </label>
      <Button disabled={busy} className="mt-6 w-full bg-emerald-500 text-[#0B1220] hover:bg-emerald-400" type="submit">
        {busy ? "Sending…" : "Send Message"}
      </Button>
    </form>
  );
}

