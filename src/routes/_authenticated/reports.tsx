import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getReportsOverview } from "@/lib/reports.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
  LineChart, Line, PieChart, Pie, Cell,
} from "recharts";
import { Download } from "lucide-react";

export const Route = createFileRoute("/_authenticated/reports")({
  component: ReportsPage,
});

const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2, 210 70% 50%))", "hsl(var(--chart-3, 30 80% 55%))", "hsl(var(--chart-4, 150 60% 45%))", "hsl(var(--chart-5, 280 60% 55%))"];

function toCsv(rows: any[], headers: string[]) {
  const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n");
}
function download(name: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

function ReportsPage() {
  const fetchReports = useServerFn(getReportsOverview);
  const q = useQuery({ queryKey: ["reports-overview"], queryFn: () => fetchReports() });
  const d: any = q.data;

  if (q.isLoading) return <p className="text-sm text-muted-foreground">Loading reports…</p>;
  if (!d) return <p className="text-sm text-muted-foreground">No data.</p>;

  const t = d.totals;
  const fmt = (n: number) => Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Reports & Analytics</h1>
          <p className="text-sm text-muted-foreground">Last 12 months revenue, expenses, MRR and service mix.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => download("monthly-report.csv", toCsv(d.monthly, ["month", "revenue", "expenses", "profit"]))}>
          <Download className="mr-2 h-4 w-4" /> Export CSV
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Stat label="Revenue (12mo)" value={fmt(t.revenue)} />
        <Stat label="Expenses (12mo)" value={fmt(t.expenses)} />
        <Stat label="Profit (12mo)" value={fmt(t.profit)} />
        <Stat label="MRR" value={fmt(t.mrr)} />
        <Stat label="Active services" value={t.active_services} />
        <Stat label="Renewals ≤60d" value={t.upcoming_renewals} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Revenue vs Expenses</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={d.monthly}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="month" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Legend />
                <Bar dataKey="revenue" fill={COLORS[0]} />
                <Bar dataKey="expenses" fill={COLORS[2]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Profit trend</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={d.monthly}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="month" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Line type="monotone" dataKey="profit" stroke={COLORS[3]} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Active service mix</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={d.service_mix} dataKey="count" nameKey="type" outerRadius={90} label>
                  {(d.service_mix ?? []).map((_: any, i: number) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Invoices by status</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={d.invoice_status}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="status" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill={COLORS[0]} name="Count" />
                <Bar dataKey="outstanding" fill={COLORS[2]} name="Outstanding" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs uppercase text-muted-foreground">{label}</div>
        <div className="mt-1 text-2xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}
