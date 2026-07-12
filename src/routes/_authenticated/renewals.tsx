import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation } from "@tanstack/react-query";
import { listUpcomingRenewals, runRenewalsBatch } from "@/lib/renewals.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/renewals")({
  component: RenewalsPage,
});

const STAGE_LABEL: Record<number, string> = {
  0: "None", 1: "30d notice", 2: "Invoiced", 3: "7d reminder", 4: "1d final", 5: "Overdue",
};

function RenewalsPage() {
  const list = useServerFn(listUpcomingRenewals);
  const run = useServerFn(runRenewalsBatch);
  const q = useQuery({ queryKey: ["upcoming-renewals"], queryFn: () => list() });
  const m = useMutation({
    mutationFn: () => run(),
    onSuccess: (r: any) => {
      toast.success(`Processed ${r.processed} · Invoices ${r.invoices_created} · Emails ${r.emails_sent} · Suspended ${r.suspended}`);
      q.refetch();
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const items = (q.data as any)?.items ?? [];

  const daysLeft = (d: string | null) => {
    if (!d) return null;
    const t = new Date(d + "T00:00:00Z").getTime();
    const now = new Date();
    const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    return Math.round((t - today) / 86400000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Renewals</h1>
          <p className="text-sm text-muted-foreground">Upcoming service expiries in the next 60 days.</p>
        </div>
        <Button onClick={() => m.mutate()} disabled={m.isPending}>
          {m.isPending ? "Running…" : "Run renewals now"}
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Upcoming ({items.length})</CardTitle></CardHeader>
        <CardContent>
          {q.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing due in the next 60 days.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Stage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((s: any) => {
                  const d = daysLeft(s.expiry_date);
                  const overdue = d !== null && d < 0;
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}<div className="text-xs text-muted-foreground">{s.type}</div></TableCell>
                      <TableCell className="text-sm">{s.profiles?.email ?? s.customer_id}</TableCell>
                      <TableCell>{s.expiry_date}</TableCell>
                      <TableCell>
                        <span className={overdue ? "text-destructive font-medium" : ""}>{d}</span>
                      </TableCell>
                      <TableCell>{Number(s.sale_price).toFixed(2)}</TableCell>
                      <TableCell><Badge variant={overdue ? "destructive" : "secondary"}>{s.status}</Badge></TableCell>
                      <TableCell><Badge variant="outline">{STAGE_LABEL[s.renewal_reminder_stage ?? 0]}</Badge></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
