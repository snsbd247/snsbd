import { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmailCaptureDialog } from "./email-capture-dialog";

export type Plan = {
  name: string;
  tagline?: string;
  price: string;
  period?: string;
  features: string[];
  featured?: boolean;
  badge?: string;
};

export function PricingCard({ plan }: { plan: Plan }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className={`relative flex flex-col rounded-3xl border p-6 transition hover:-translate-y-1 hover:shadow-2xl ${
        plan.featured
          ? "border-emerald-400 bg-white shadow-xl ring-2 ring-emerald-400/40"
          : "border-slate-200 bg-white"
      }`}
    >
      {plan.badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-400 px-3 py-1 text-xs font-bold text-[#0B1220]">
          {plan.badge}
        </div>
      )}
      <div className="text-lg font-bold text-slate-900">{plan.name}</div>
      {plan.tagline && <div className="mt-1 text-sm text-slate-500">{plan.tagline}</div>}
      <div className="mt-4 flex items-baseline gap-1">
        <span className="text-4xl font-black text-slate-900">{plan.price}</span>
        {plan.period && <span className="text-sm text-slate-500">/{plan.period}</span>}
      </div>
      <ul className="mt-6 flex-1 space-y-3 text-sm text-slate-700">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <Button
        onClick={() => setOpen(true)}
        className={`mt-6 ${plan.featured ? "bg-emerald-500 text-[#0B1220] hover:bg-emerald-400" : ""}`}
        variant={plan.featured ? "default" : "outline"}
      >
        Order Now
      </Button>
      <EmailCaptureDialog open={open} onOpenChange={setOpen} planName={plan.name} />
    </div>
  );
}
