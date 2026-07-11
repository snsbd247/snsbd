import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText, Loader2, LogIn, Copy } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { formatBDT, formatDate, daysUntil } from "@/lib/format";
import { generateInvoiceDraft } from "@/lib/generate-invoice";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/services/$serviceId")({
  component: ServiceDetailPage,
});

function cpanelLogin(url: string, user: string, pass: string) {
  try {
    const base = url.replace(/\/+$/, "");
    const action = /\/login\/?$/i.test(base) ? base : `${base}/login/`;
    const win = window.open("about:blank", "_blank");
    if (!win) { toast.error("Popup blocked — allow popups to auto-login"); return; }
    const form = win.document.createElement("form");
    form.method = "POST";
    form.action = action;
    form.enctype = "application/x-www-form-urlencoded";
    for (const [k, v] of Object.entries({ user, pass, goto_uri: "/" })) {
      const input = win.document.createElement("input");
      input.type = "hidden"; input.name = k; input.value = v;
      form.appendChild(input);
    }
    win.document.body.appendChild(form);
    form.submit();
  } catch (e: any) {
    toast.error(e?.message ?? "Failed to open cPanel");
  }
}

function PasswordReveal({ value }: { value: string }) {
  const [show, setShow] = useState(false);
  return (
    <>
      <span className="font-mono">{show ? value : "•".repeat(Math.min(value.length, 12))}</span>
      <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setShow((s) => !s)}>{show ? "Hide" : "Show"}</Button>
      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { navigator.clipboard.writeText(value); toast.success("Copied"); }}><Copy className="h-3 w-3" /></Button>
    </>
  );
}


function ServiceDetailPage() {
  const { serviceId } = Route.useParams();
  const { role } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isAdmin = role === "admin";

  const { data: service, isLoading } = useQuery({
    queryKey: ["service", serviceId],
    queryFn: async () => {
      const { data, error } = await supabase.from("services")
        .select("*, profiles(id, full_name, email, company), projects(id, name)")
        .eq("id", serviceId).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: invoices } = useQuery({
    queryKey: ["service-invoices", serviceId],
    queryFn: async () => {
      const { data } = await supabase.from("invoice_items")
        .select("invoice_id, total, invoices(id, invoice_number, status, issue_date, total)")
        .eq("service_id", serviceId);
      return data ?? [];
    },
  });

  const generate = useMutation({
    mutationFn: async () => {
      if (!service) throw new Error("No service");
      const id = await generateInvoiceDraft({
        customer_id: service.customer_id,
        project_id: service.project_id ?? null,
        items: [{
          description: `${service.type.toUpperCase()} — ${service.name}${service.details ? " (" + service.details + ")" : ""}`,
          quantity: 1,
          unit_price: Number(service.sale_price) || 0,
          service_id: service.id,
        }],
      });
      return id;
    },
    onSuccess: (id) => {
      toast.success("Invoice draft created");
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["service-invoices", serviceId] });
      navigate({ to: "/invoices" });
      void id;
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <div className="flex items-center gap-2 text-sm text-muted-foreground p-6"><Loader2 className="h-4 w-4 animate-spin" />Loading service…</div>;
  if (!service) return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">Service not found.</div>
      <Button variant="outline" onClick={() => navigate({ to: "/domains" })}><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
    </div>
  );

  const backTo = service.type === "domain" ? "/domains" : service.type === "hosting" ? "/hosting" : "/other-services";
  const backLabel = service.type === "domain" ? "Domains" : service.type === "hosting" ? "Hosting" : "Other Services";
  const days = daysUntil(service.expiry_date);

  return (
    <div className="space-y-6 max-w-4xl">
      <nav className="text-xs text-muted-foreground flex items-center gap-1.5" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-foreground">Home</Link>
        <span>/</span>
        <Link to={backTo} className="hover:text-foreground">{backLabel}</Link>
        <span>/</span>
        <span className="text-foreground font-medium truncate max-w-[240px]">{service.name}</span>
      </nav>
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => navigate({ to: backTo })}>
          <ArrowLeft className="mr-2 h-4 w-4" />Back to {backLabel}
        </Button>
        {isAdmin && (
          <Button onClick={() => generate.mutate()} disabled={generate.isPending}>
            <FileText className="mr-2 h-4 w-4" />Generate invoice
          </Button>
        )}
      </div>

      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{service.name}</h1>
          <Badge variant="outline" className="capitalize">{service.type}</Badge>
          <Badge variant={service.status === "active" ? "default" : "secondary"} className="capitalize">{service.status}</Badge>
        </div>
        {service.details && <p className="mt-2 text-sm text-muted-foreground">{service.details}</p>}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Customer</div><div className="text-sm font-medium mt-1">{service.profiles?.full_name ?? service.profiles?.email ?? "—"}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Project</div><div className="text-sm font-medium mt-1">{service.projects?.name ? <Link to="/projects/$projectId" params={{ projectId: service.projects.id }} className="text-primary hover:underline">{service.projects.name}</Link> : "—"}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Purchase</div><div className="text-sm font-medium mt-1">{formatDate(service.purchase_date)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Expiry</div><div className="text-sm font-medium mt-1">{formatDate(service.expiry_date)}{days != null && <Badge variant={days < 0 ? "destructive" : days <= 30 ? "secondary" : "outline"} className="ml-2">{days < 0 ? "Expired" : `${days}d`}</Badge>}</div></CardContent></Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Cost price</div><div className="text-sm font-medium mt-1">{formatBDT(service.cost_price)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Sale price</div><div className="text-sm font-medium mt-1">{formatBDT(service.sale_price)}</div></CardContent></Card>
      </div>

      {service.type === "hosting" && (service.cpanel_url || service.cpanel_username || service.cpanel_password) && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">cPanel access</CardTitle>
            {service.cpanel_url && service.cpanel_username && service.cpanel_password && (
              <Button size="sm" onClick={() => cpanelLogin(service.cpanel_url!, service.cpanel_username!, service.cpanel_password!)}>
                <LogIn className="mr-2 h-4 w-4" />Login to cPanel
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center gap-2"><span className="text-muted-foreground w-24">URL</span><span className="font-mono">{service.cpanel_url || "—"}</span></div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground w-24">Username</span>
              <span className="font-mono">{service.cpanel_username || "—"}</span>
              {service.cpanel_username && <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { navigator.clipboard.writeText(service.cpanel_username!); toast.success("Copied"); }}><Copy className="h-3 w-3" /></Button>}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground w-24">Password</span>
              <PasswordReveal value={service.cpanel_password || ""} />
            </div>
          </CardContent>
        </Card>
      )}

      {service.notes && (
        <Card><CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader><CardContent><p className="text-sm whitespace-pre-wrap">{service.notes}</p></CardContent></Card>
      )}


      <Card>
        <CardHeader><CardTitle className="text-base">Invoices</CardTitle></CardHeader>
        <CardContent>
          {(!invoices || invoices.length === 0) && <div className="text-sm text-muted-foreground">No invoices yet for this service.</div>}
          <div className="space-y-1">
            {(invoices ?? []).map((row: any) => row.invoices && (
              <Link key={row.invoice_id} to="/invoices/$invoiceId" params={{ invoiceId: row.invoices.id }} className="flex items-center justify-between text-sm border-b py-2 hover:bg-muted/40 px-2 -mx-2 rounded">
                <span className="font-mono text-xs">{row.invoices.invoice_number}</span>
                <span className="text-muted-foreground">{formatDate(row.invoices.issue_date)}</span>
                <Badge variant="outline" className="capitalize">{row.invoices.status}</Badge>
                <span className="font-medium">{formatBDT(row.invoices.total)}</span>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
