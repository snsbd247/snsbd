import { createFileRoute } from "@tanstack/react-router";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, Globe, HardDrive, Package, FolderKanban, FileText, LogIn } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { formatBDT, formatDate, daysUntil } from "@/lib/format";
import { useServerFn } from "@tanstack/react-start";
import { createPortalSession } from "@/lib/customers.functions";
import { toast } from "sonner";
import { useState } from "react";


export const Route = createFileRoute("/_authenticated/customers_/$customerId")({
  component: CustomerDetailPage,
});

function CustomerDetailPage() {
  const { customerId } = Route.useParams();
  const { role } = useAuth();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["customer-detail", customerId],
    queryFn: async () => {
      const [profile, projects, services, invoices] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", customerId).maybeSingle(),
        supabase.from("projects").select("*").eq("customer_id", customerId).order("created_at", { ascending: false }),
        supabase.from("services").select("*").eq("customer_id", customerId).order("created_at", { ascending: false }),
        supabase.from("invoices").select("id, invoice_number, status, issue_date, total, amount_paid").eq("customer_id", customerId).order("issue_date", { ascending: false }),
      ]);
      return {
        profile: profile.data,
        projects: projects.data ?? [],
        services: services.data ?? [],
        invoices: invoices.data ?? [],
      };
    },
  });

  if (role !== "admin") return <p className="text-sm text-muted-foreground">Admin only.</p>;
  if (isLoading) return <div className="flex items-center gap-2 text-sm text-muted-foreground p-6"><Loader2 className="h-4 w-4 animate-spin" />Loading customer…</div>;
  if (!data?.profile) return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">Customer not found.</div>
      <Button variant="outline" onClick={() => navigate({ to: "/customers" })}><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
    </div>
  );

  const p = data.profile;
  const domains = data.services.filter((s: any) => s.type === "domain");
  const hosting = data.services.filter((s: any) => s.type === "hosting");
  const others = data.services.filter((s: any) => s.type === "other" || s.type === "software");

  return (
    <div className="space-y-6 max-w-5xl">
      <nav className="text-xs text-muted-foreground flex items-center gap-1.5" aria-label="Breadcrumb">
        <Link to="/customers" className="hover:text-foreground">Customers</Link>
        <span>/</span>
        <span className="text-foreground font-medium">{p.full_name ?? p.email}</span>
      </nav>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{p.full_name ?? p.email}</h1>
          <div className="text-sm text-muted-foreground space-y-0.5 mt-1">
            {p.company && <div>{p.company}</div>}
            {p.email && <div>{p.email}</div>}
            {p.phone && <div>{p.phone}</div>}
            {p.address && <div className="whitespace-pre-line">{p.address}</div>}
          </div>
        </div>
        <div className="flex gap-2">
          <LoginAsCustomerButton customerId={customerId} />
          <Button variant="outline" size="sm" onClick={() => navigate({ to: "/customers" })}>
            <ArrowLeft className="mr-2 h-4 w-4" />Back
          </Button>
        </div>
      </div>


      <div className="grid gap-4 md:grid-cols-4">
        <StatCard icon={FolderKanban} label="Projects" value={data.projects.length} />
        <StatCard icon={Globe} label="Domains" value={domains.length} />
        <StatCard icon={HardDrive} label="Hosting" value={hosting.length} />
        <StatCard icon={Package} label="Other services" value={others.length} />
      </div>

      <Section title="Projects" icon={FolderKanban}>
        {data.projects.length === 0 ? <Empty text="No projects." /> : (
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Status</TableHead><TableHead>Deadline</TableHead></TableRow></TableHeader>
            <TableBody>
              {data.projects.map((pr: any) => (
                <TableRow key={pr.id}>
                  <TableCell><Link to="/projects/$projectId" params={{ projectId: pr.id }} className="hover:underline font-medium">{pr.name}</Link></TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{pr.status}</Badge></TableCell>
                  <TableCell>{formatDate(pr.deadline)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Section>

      <ServiceSection title="Domains" icon={Globe} rows={domains} kind="domain" />
      <ServiceSection title="Hosting" icon={HardDrive} rows={hosting} kind="hosting" />
      <ServiceSection title="Other services" icon={Package} rows={others} kind="other" />

      <Section title="Invoices" icon={FileText}>
        {data.invoices.length === 0 ? <Empty text="No invoices yet." /> : (
          <Table>
            <TableHeader><TableRow><TableHead>Number</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="text-right">Paid</TableHead></TableRow></TableHeader>
            <TableBody>
              {data.invoices.map((inv: any) => (
                <TableRow key={inv.id}>
                  <TableCell><Link to="/invoices/$invoiceId" params={{ invoiceId: inv.id }} className="hover:underline font-mono text-xs">{inv.invoice_number}</Link></TableCell>
                  <TableCell>{formatDate(inv.issue_date)}</TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{inv.status}</Badge></TableCell>
                  <TableCell className="text-right">{formatBDT(inv.total)}</TableCell>
                  <TableCell className="text-right">{formatBDT(inv.amount_paid)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Section>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <Card><CardContent className="p-4 flex items-center gap-3">
      <div className="p-2 bg-muted rounded-md"><Icon className="h-5 w-5" /></div>
      <div><div className="text-xs text-muted-foreground">{label}</div><div className="text-xl font-semibold">{value}</div></div>
    </CardContent></Card>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Icon className="h-4 w-4" />{title}</CardTitle></CardHeader>
      <CardContent className="p-0">{children}</CardContent>
    </Card>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground px-6 pb-6">{text}</p>;
}

function ServiceSection({ title, icon, rows, kind }: { title: string; icon: any; rows: any[]; kind: "domain" | "hosting" | "other" }) {
  return (
    <Section title={title} icon={icon}>
      {rows.length === 0 ? <Empty text={`No ${title.toLowerCase()} yet.`} /> : (
        <Table>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Expiry</TableHead><TableHead>Renewable</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Price</TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.map((s: any) => {
              const d = daysUntil(s.expiry_date);
              const to = kind === "domain" ? "/domains/$domainId" : "/services/$serviceId";
              const params = kind === "domain" ? { domainId: s.id } : { serviceId: s.id };
              return (
                <TableRow key={s.id}>
                  <TableCell><Link to={to} params={params as any} className="hover:underline font-medium">{s.name}</Link></TableCell>
                  <TableCell>{formatDate(s.expiry_date)}{d != null && <Badge variant={d < 0 ? "destructive" : d <= 30 ? "secondary" : "outline"} className="ml-2">{d < 0 ? "Expired" : `${d}d`}</Badge>}</TableCell>
                  <TableCell>{s.renewable ? <Badge>Auto</Badge> : <span className="text-xs text-muted-foreground">—</span>}</TableCell>
                  <TableCell><Badge variant={s.status === "active" ? "default" : "secondary"} className="capitalize">{s.status}</Badge></TableCell>
                  <TableCell className="text-right">{formatBDT(s.sale_price)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </Section>
  );
}

function LoginAsCustomerButton({ customerId }: { customerId: string }) {
  const fn = useServerFn(createPortalSession);
  const [loading, setLoading] = useState(false);
  const onClick = async () => {
    setLoading(true);
    try {
      const res = await fn({ data: { customer_id: customerId } });
      const url = `${window.location.origin}/portal#at=${encodeURIComponent(res.access_token)}&rt=${encodeURIComponent(res.refresh_token)}`;
      const win = window.open(url, "_blank", "noopener");
      if (!win) toast.error("Popup blocked — allow popups to open the portal");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to open portal");
    } finally {
      setLoading(false);
    }
  };
  return (
    <Button size="sm" onClick={onClick} disabled={loading}>
      <LogIn className="mr-2 h-4 w-4" />{loading ? "Opening…" : "Login as customer"}
    </Button>
  );
}
