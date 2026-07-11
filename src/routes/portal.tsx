import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getPortalClient } from "@/integrations/supabase/portal-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatBDT, formatDate } from "@/lib/format";

export const Route = createFileRoute("/portal")({
  ssr: false,
  component: PortalPage,
});

function PortalPage() {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [err, setErr] = useState<string>("");
  const [profile, setProfile] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const client = getPortalClient();
      try {
        const hash = window.location.hash.replace(/^#/, "");
        const params = new URLSearchParams(hash);
        const at = params.get("at");
        const rt = params.get("rt");
        if (at && rt) {
          const { error } = await client.auth.setSession({ access_token: at, refresh_token: rt });
          if (error) throw error;
          // Clean the URL so tokens don't linger.
          window.history.replaceState({}, "", window.location.pathname);
        }
        const { data: userData, error: uErr } = await client.auth.getUser();
        if (uErr || !userData.user) throw new Error("No portal session. Please log in from the admin panel.");
        const uid = userData.user.id;

        const [p, pr, sv, inv] = await Promise.all([
          client.from("profiles").select("*").eq("id", uid).maybeSingle(),
          client.from("projects").select("*").eq("customer_id", uid).order("created_at", { ascending: false }),
          client.from("services").select("*").eq("customer_id", uid).order("created_at", { ascending: false }),
          client.from("invoices").select("id, invoice_number, status, issue_date, total, amount_paid")
            .eq("customer_id", uid).order("issue_date", { ascending: false }),
        ]);
        setProfile(p.data);
        setProjects(pr.data ?? []);
        setServices(sv.data ?? []);
        setInvoices(inv.data ?? []);
        setStatus("ready");
      } catch (e: any) {
        setErr(e?.message ?? "Failed to load portal");
        setStatus("error");
      }
    })();
  }, []);

  const signOut = async () => {
    await getPortalClient().auth.signOut();
    window.close();
  };

  if (status === "loading") {
    return <div className="p-8 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Signing you in…</div>;
  }
  if (status === "error") {
    return <div className="p-8 text-sm text-destructive">{err}</div>;
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs text-muted-foreground">Customer portal</div>
          <h1 className="text-2xl font-bold">{profile?.full_name ?? profile?.email}</h1>
          {profile?.company && <div className="text-sm text-muted-foreground">{profile.company}</div>}
        </div>
        <Button variant="outline" size="sm" onClick={signOut}><LogOut className="mr-2 h-4 w-4" />Sign out</Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Projects</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {projects.length === 0 && <div className="text-muted-foreground">No projects.</div>}
          {projects.map((p) => (
            <div key={p.id} className="flex justify-between border-b py-2">
              <span className="font-medium">{p.name}</span>
              <Badge variant="outline" className="capitalize">{p.status}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Services</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {services.length === 0 && <div className="text-muted-foreground">No services.</div>}
          {services.map((s) => (
            <div key={s.id} className="flex justify-between border-b py-2">
              <span className="font-medium">{s.name}</span>
              <span className="text-xs text-muted-foreground">{s.type} · expires {formatDate(s.expiry_date)}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Invoices</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {invoices.length === 0 && <div className="text-muted-foreground">No invoices.</div>}
          {invoices.map((i) => (
            <div key={i.id} className="flex justify-between border-b py-2">
              <span className="font-mono text-xs">{i.invoice_number}</span>
              <span className="text-xs text-muted-foreground">{formatDate(i.issue_date)}</span>
              <Badge variant="outline" className="capitalize">{i.status}</Badge>
              <span className="font-medium">{formatBDT(i.total)}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
