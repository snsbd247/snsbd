import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, Save, Trash2, FileText, Globe } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { formatBDT, formatDate, daysUntil } from "@/lib/format";
import { generateInvoiceDraft } from "@/lib/generate-invoice";

export const Route = createFileRoute("/_authenticated/domains/$domainId")({
  component: DomainDetailPage,
});

function DomainDetailPage() {
  const { domainId } = Route.useParams();
  const { role } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isAdmin = role === "admin";

  const { data: domain, isLoading } = useQuery({
    queryKey: ["domain", domainId],
    queryFn: async () => {
      const { data, error } = await supabase.from("services")
        .select("*, profiles(id, full_name, email), projects(id, name), linked_hosting:linked_hosting_id(id, name)")
        .eq("id", domainId).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: invoices } = useQuery({
    queryKey: ["service-invoices", domainId],
    queryFn: async () => (await supabase.from("invoice_items")
      .select("invoice_id, invoices(id, invoice_number, status, issue_date, total)")
      .eq("service_id", domainId)).data ?? [],
  });

  const { data: hostings } = useQuery({
    queryKey: ["hosting-options", domain?.customer_id],
    enabled: isAdmin && !!domain?.customer_id,
    queryFn: async () => (await supabase.from("services").select("id, name").eq("type", "hosting").eq("customer_id", domain!.customer_id).order("name")).data ?? [],
  });

  const [f, setF] = useState<any>(null);
  useEffect(() => {
    if (domain) setF({
      name: domain.name, details: domain.details ?? "", registrar: domain.registrar ?? "",
      nameservers: domain.nameservers ?? "", dns_notes: domain.dns_notes ?? "",
      linked_hosting_id: domain.linked_hosting_id ?? "", purchase_date: domain.purchase_date ?? "",
      expiry_date: domain.expiry_date ?? "", cost_price: String(domain.cost_price ?? "0"),
      sale_price: String(domain.sale_price ?? "0"), status: domain.status, notes: domain.notes ?? "",
    });
  }, [domain]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        ...f,
        linked_hosting_id: f.linked_hosting_id || null,
        purchase_date: f.purchase_date || null,
        expiry_date: f.expiry_date || null,
        cost_price: Number(f.cost_price) || 0,
        sale_price: Number(f.sale_price) || 0,
      };
      const { error } = await supabase.from("services").update(payload).eq("id", domainId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["domain", domainId] }); qc.invalidateQueries({ queryKey: ["services"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("services").delete().eq("id", domainId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["services"] }); navigate({ to: "/domains" }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const generate = useMutation({
    mutationFn: async () => {
      if (!domain) throw new Error("No domain");
      return await generateInvoiceDraft({
        customer_id: domain.customer_id,
        project_id: domain.project_id ?? null,
        items: [{
          description: `Domain — ${domain.name}${domain.registrar ? " (" + domain.registrar + ")" : ""}`,
          quantity: 1, unit_price: Number(domain.sale_price) || 0, service_id: domain.id,
        }],
      });
    },
    onSuccess: () => { toast.success("Invoice draft created"); qc.invalidateQueries({ queryKey: ["invoices"] }); navigate({ to: "/invoices" }); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !f) return <div className="flex items-center gap-2 text-sm text-muted-foreground p-6"><Loader2 className="h-4 w-4 animate-spin" />Loading domain…</div>;
  if (!domain) return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">Domain not found.</div>
      <Button variant="outline" onClick={() => navigate({ to: "/domains" })}><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
    </div>
  );

  const days = daysUntil(domain.expiry_date);

  return (
    <div className="space-y-6 max-w-4xl">
      <nav className="text-xs text-muted-foreground flex items-center gap-1.5" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-foreground">Home</Link>
        <span>/</span>
        <Link to="/domains" className="hover:text-foreground">Domains</Link>
        <span>/</span>
        <span className="text-foreground font-medium truncate max-w-[240px]">{domain.name}</span>
      </nav>
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => navigate({ to: "/domains" })}>
          <ArrowLeft className="mr-2 h-4 w-4" />Back to Domains
        </Button>
        {isAdmin && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => generate.mutate()} disabled={generate.isPending}><FileText className="mr-2 h-4 w-4" />Generate invoice</Button>
            <Button variant="destructive" onClick={() => { if (confirm("Delete domain?")) del.mutate(); }}><Trash2 className="mr-2 h-4 w-4" />Delete</Button>
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center gap-3">
          <Globe className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">{domain.name}</h1>
          <Badge variant={domain.status === "active" ? "default" : "secondary"} className="capitalize">{domain.status}</Badge>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Customer</div><div className="text-sm font-medium mt-1">{domain.profiles?.full_name ?? domain.profiles?.email ?? "—"}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Project</div><div className="text-sm font-medium mt-1">{domain.projects?.name ? <Link to="/projects/$projectId" params={{ projectId: domain.projects.id }} className="text-primary hover:underline">{domain.projects.name}</Link> : "—"}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Purchase</div><div className="text-sm font-medium mt-1">{formatDate(domain.purchase_date)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Expiry</div><div className="text-sm font-medium mt-1">{formatDate(domain.expiry_date)}{days != null && <Badge variant={days < 0 ? "destructive" : days <= 30 ? "secondary" : "outline"} className="ml-2">{days < 0 ? "Expired" : `${days}d`}</Badge>}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">DNS &amp; Hosting</CardTitle></CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Registrar</Label><Input value={f.registrar} disabled={!isAdmin} onChange={(e) => setF({ ...f, registrar: e.target.value })} placeholder="e.g. Namecheap, GoDaddy" /></div>
            <div>
              <Label>Linked hosting</Label>
              <Select value={f.linked_hosting_id || "none"} disabled={!isAdmin} onValueChange={(v) => setF({ ...f, linked_hosting_id: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {(hostings ?? []).map((h: any) => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {domain.linked_hosting && <div className="text-xs text-muted-foreground mt-1">Currently: <Link to="/services/$serviceId" params={{ serviceId: domain.linked_hosting.id }} className="text-primary hover:underline">{domain.linked_hosting.name}</Link></div>}
            </div>
          </div>
          <div><Label>Nameservers</Label><Textarea rows={2} value={f.nameservers} disabled={!isAdmin} onChange={(e) => setF({ ...f, nameservers: e.target.value })} placeholder="ns1.example.com&#10;ns2.example.com" /></div>
          <div><Label>DNS notes / records</Label><Textarea rows={4} value={f.dns_notes} disabled={!isAdmin} onChange={(e) => setF({ ...f, dns_notes: e.target.value })} placeholder="A / CNAME / MX / TXT records…" /></div>
        </CardContent>
      </Card>

      {isAdmin && (
        <Card>
          <CardHeader><CardTitle className="text-base">Domain settings</CardTitle></CardHeader>
          <CardContent className="grid gap-3">
            <div><Label>Domain name</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
            <div><Label>Details</Label><Input value={f.details} onChange={(e) => setF({ ...f, details: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Purchase date</Label><Input type="date" value={f.purchase_date} onChange={(e) => setF({ ...f, purchase_date: e.target.value })} /></div>
              <div><Label>Expiry date</Label><Input type="date" value={f.expiry_date} onChange={(e) => setF({ ...f, expiry_date: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Cost (৳)</Label><Input type="number" step="0.01" value={f.cost_price} onChange={(e) => setF({ ...f, cost_price: e.target.value })} /></div>
              <div><Label>Sale (৳)</Label><Input type="number" step="0.01" value={f.sale_price} onChange={(e) => setF({ ...f, sale_price: e.target.value })} /></div>
              <div>
                <Label>Status</Label>
                <Select value={f.status} onValueChange={(v) => setF({ ...f, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["active","pending","expired","cancelled"].map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Notes</Label><Textarea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
            <div className="flex justify-end"><Button onClick={() => save.mutate()} disabled={save.isPending}><Save className="mr-2 h-4 w-4" />Save changes</Button></div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Invoices</CardTitle></CardHeader>
        <CardContent>
          {(!invoices || invoices.length === 0) ? (
            <div className="text-sm text-muted-foreground">No invoices yet for this domain.</div>
          ) : (
            <div className="space-y-1">
              {invoices.map((row: any) => row.invoices && (
                <Link key={row.invoice_id} to="/invoices/$invoiceId" params={{ invoiceId: row.invoices.id }} className="flex items-center justify-between text-sm border-b py-2 hover:bg-muted/40 px-2 -mx-2 rounded">
                  <span className="font-mono text-xs">{row.invoices.invoice_number}</span>
                  <span className="text-muted-foreground">{formatDate(row.invoices.issue_date)}</span>
                  <Badge variant="outline" className="capitalize">{row.invoices.status}</Badge>
                  <span className="font-medium">{formatBDT(row.invoices.total)}</span>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
