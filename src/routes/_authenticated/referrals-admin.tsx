import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { listAllCommissions, setCommissionStatus } from "@/lib/referrals.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/referrals-admin")({ component: RefAdmin });

function RefAdmin() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<string>("");
  const list = useServerFn(listAllCommissions);
  const setStatusFn = useServerFn(setCommissionStatus);
  const q = useQuery({ queryKey: ["admin-commissions", status], queryFn: () => list({ data: { status: status || undefined } }) });
  const m = useMutation({
    mutationFn: (v: { id: string; status: "pending" | "paid" | "void" }) => setStatusFn({ data: v }),
    onSuccess: () => { toast.success("Updated"); qc.invalidateQueries({ queryKey: ["admin-commissions"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
  const items = (q.data as any)?.items ?? [];
  const total = items.reduce((s: number, r: any) => s + Number(r.amount), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Referral commissions</h1>
        <p className="text-sm text-muted-foreground">Approve or void referral payouts.</p>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Commissions ({items.length}) · {total.toFixed(2)}</CardTitle>
          <select className="rounded-md border bg-background px-3 py-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="void">Void</option>
          </select>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Referrer</TableHead>
                <TableHead>Referred customer</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>When</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="text-sm">{c.referrer_id}</TableCell>
                  <TableCell className="text-sm">{c.referred_user_id}</TableCell>
                  <TableCell>{Number(c.amount).toFixed(2)}</TableCell>
                  <TableCell>{Number(c.rate_percent).toFixed(0)}%</TableCell>
                  <TableCell>
                    <Badge variant={c.status === "paid" ? "default" : c.status === "void" ? "destructive" : "secondary"}>{c.status}</Badge>
                  </TableCell>
                  <TableCell className="text-xs">{new Date(c.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right space-x-1">
                    {c.status !== "paid" && <Button size="sm" variant="outline" onClick={() => m.mutate({ id: c.id, status: "paid" })}>Mark paid</Button>}
                    {c.status !== "void" && <Button size="sm" variant="ghost" onClick={() => m.mutate({ id: c.id, status: "void" })}>Void</Button>}
                  </TableCell>
                </TableRow>
              ))}
              {items.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground">No commissions.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
