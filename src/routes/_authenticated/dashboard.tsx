import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBDT, formatDate, daysUntil } from "@/lib/format";
import { Server, Users, FileText, AlertTriangle, Wallet, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { role, user } = useAuth();
  return role === "admin" ? <AdminDashboard /> : <CustomerDashboard uid={user?.id ?? ""} />;
}

function AdminDashboard() {
  const stats = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [customers, services, invoices, expenses, expiring] = await Promise.all([
        db.from("profiles").select("id", { count: "exact", head: true }),
        db.from("services").select("id", { count: "exact", head: true }).eq("status", "active"),
        db.from("invoices").select("total, amount_paid, status"),
        db.from("expenses").select("amount"),
        db.from("services").select("id, name, type, expiry_date, customer_id, profiles(full_name, email)")
          .gte("expiry_date", new Date().toISOString().slice(0, 10))
          .lte("expiry_date", new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10))
          .order("expiry_date", { ascending: true }),
      ]);
      const invRows = invoices.data ?? [];
      const totalBilled = invRows.reduce((s, i) => s + Number(i.total ?? 0), 0);
      const totalReceived = invRows.reduce((s, i) => s + Number(i.amount_paid ?? 0), 0);
      const totalExpenses = (expenses.data ?? []).reduce((s, e) => s + Number(e.amount ?? 0), 0);
      const overdue = invRows.filter((i) => i.status === "overdue" || (i.status !== "paid" && i.status !== "cancelled" && Number(i.amount_paid ?? 0) < Number(i.total ?? 0))).length;
      return {
        customers: customers.count ?? 0,
        activeServices: services.count ?? 0,
        totalBilled,
        totalReceived,
        totalOutstanding: totalBilled - totalReceived,
        totalExpenses,
        overdue,
        expiring: expiring.data ?? [],
      };
    },
  });

  const s = stats.data;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of your business.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Customers" value={String(s?.customers ?? "—")} />
        <StatCard icon={Server} label="Active Services" value={String(s?.activeServices ?? "—")} />
        <StatCard icon={FileText} label="Total Billed" value={s ? formatBDT(s.totalBilled) : "—"} />
        <StatCard icon={TrendingUp} label="Received" value={s ? formatBDT(s.totalReceived) : "—"} tone="success" />
        <StatCard icon={AlertTriangle} label="Outstanding" value={s ? formatBDT(s.totalOutstanding) : "—"} tone="warning" />
        <StatCard icon={Wallet} label="Total Expenses" value={s ? formatBDT(s.totalExpenses) : "—"} />
        <StatCard icon={FileText} label="Overdue Invoices" value={String(s?.overdue ?? "—")} tone="destructive" />
        <StatCard icon={TrendingUp} label="Net (Received − Expenses)" value={s ? formatBDT(s.totalReceived - s.totalExpenses) : "—"} />
      </div>

      <Card>
        <CardHeader><CardTitle>Expiring in 30 days</CardTitle></CardHeader>
        <CardContent>
          {(s?.expiring ?? []).length === 0 && <p className="text-sm text-muted-foreground">Nothing expiring soon.</p>}
          <div className="space-y-2">
            {(s?.expiring ?? []).map((e: any) => {
              const d = daysUntil(e.expiry_date);
              return (
                <div key={e.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <div className="font-medium text-sm">{e.name}</div>
                    <div className="text-xs text-muted-foreground">{e.type} · {e.profiles?.full_name || e.profiles?.email}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={d != null && d <= 7 ? "destructive" : "secondary"}>{d} days</Badge>
                    <span className="text-xs text-muted-foreground">{formatDate(e.expiry_date)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CustomerDashboard({ uid }: { uid: string }) {
  const data = useQuery({
    queryKey: ["customer-stats", uid],
    enabled: !!uid,
    queryFn: async () => {
      const [services, invoices, projects] = await Promise.all([
        db.from("services").select("*").eq("customer_id", uid).order("expiry_date"),
        db.from("invoices").select("*").eq("customer_id", uid).order("issue_date", { ascending: false }),
        db.from("projects").select("*").eq("customer_id", uid),
      ]);
      const invRows = invoices.data ?? [];
      const outstanding = invRows.reduce((s, i) => s + (Number(i.total) - Number(i.amount_paid)), 0);
      return {
        services: services.data ?? [],
        invoices: invRows,
        projects: projects.data ?? [],
        outstanding,
      };
    },
  });

  const d = data.data;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome</h1>
        <p className="text-sm text-muted-foreground">Your services and billing at a glance.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Server} label="Services" value={String(d?.services.length ?? "—")} />
        <StatCard icon={FileText} label="Invoices" value={String(d?.invoices.length ?? "—")} />
        <StatCard icon={AlertTriangle} label="Outstanding" value={d ? formatBDT(d.outstanding) : "—"} tone={d && d.outstanding > 0 ? "warning" : undefined} />
        <StatCard icon={FolderKanbanIcon} label="Projects" value={String(d?.projects.length ?? "—")} />
      </div>

      <Card>
        <CardHeader><CardTitle>Upcoming Renewals</CardTitle></CardHeader>
        <CardContent>
          {(d?.services ?? []).filter((s: any) => s.expiry_date).slice(0, 5).map((s: any) => {
            const days = daysUntil(s.expiry_date);
            return (
              <div key={s.id} className="flex items-center justify-between border-b py-2 last:border-0">
                <div>
                  <div className="text-sm font-medium">{s.name}</div>
                  <div className="text-xs text-muted-foreground capitalize">{s.type}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs">{formatDate(s.expiry_date)}</div>
                  <Badge variant={days != null && days < 0 ? "destructive" : days != null && days <= 30 ? "secondary" : "outline"}>
                    {days != null && days < 0 ? "Expired" : `${days} days`}
                  </Badge>
                </div>
              </div>
            );
          })}
          {(d?.services ?? []).length === 0 && <p className="text-sm text-muted-foreground">No services yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}

import { FolderKanban as FolderKanbanIcon } from "lucide-react";
import { db } from "@/lib/db-shim";

function StatCard({ icon: Icon, label, value, tone }: { icon: any; label: string; value: string; tone?: "success" | "warning" | "destructive" }) {
  const toneClass = tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : tone === "destructive" ? "text-destructive" : "text-foreground";
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
          <Icon className={`h-4 w-4 ${toneClass}`} />
        </div>
        <div className={`mt-2 text-2xl font-bold ${toneClass}`}>{value}</div>
      </CardContent>
    </Card>
  );
}
