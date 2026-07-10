import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Building2, Users, FileText, Server, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/dashboard" });
  },
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold">N</div>
            <span className="font-semibold text-lg">Nexus CRM</span>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="ghost"><Link to="/auth">Sign in</Link></Button>
            <Button asChild><Link to="/auth" search={{ mode: "signup" }}>Get started</Link></Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-20">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border bg-accent/50 px-3 py-1 text-xs font-medium text-accent-foreground">
            Built for domain, hosting & software sellers
          </div>
          <h1 className="mt-6 text-5xl font-bold tracking-tight leading-tight">
            Run your entire business from <span className="text-primary">one dashboard</span>.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            Manage customers, track domains and hosting renewals, send invoices, pay your team, and log every expense — with a self-service portal for your customers.
          </p>
          <div className="mt-8 flex gap-3">
            <Button asChild size="lg">
              <Link to="/auth" search={{ mode: "signup" }}>
                Start free <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline"><Link to="/auth">Sign in</Link></Button>
          </div>
        </div>

        <div className="mt-24 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Users, title: "Customers", desc: "One profile per customer with contact info and service history." },
            { icon: Server, title: "Services", desc: "Track every domain, hosting plan and software license with expiry alerts." },
            { icon: FileText, title: "Billing", desc: "Create invoices, record payments and monitor overdue balances." },
            { icon: Building2, title: "Team & Expenses", desc: "Pay staff salaries and log office, server and marketing costs." },
          ].map((f) => (
            <div key={f.title} className="rounded-xl border bg-card p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
