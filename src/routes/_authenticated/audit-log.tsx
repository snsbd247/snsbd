import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { listAuditLogs } from "@/lib/audit.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/audit-log")({ component: AuditPage });

function AuditPage() {
  const [filter, setFilter] = useState("");
  const fetchLogs = useServerFn(listAuditLogs);
  const q = useQuery({ queryKey: ["audit", filter], queryFn: () => fetchLogs({ data: { action: filter || undefined } }) });
  const items = (q.data as any)?.items ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Audit log</h1>
        <p className="text-sm text-muted-foreground">Recent admin & system activity.</p>
      </div>
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Events</CardTitle>
          <Input placeholder="Filter by action…" className="max-w-xs" value={filter} onChange={(e) => setFilter(e.target.value)} />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs">{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</TableCell>
                  <TableCell className="text-xs">{r.actor_id ?? "system"}</TableCell>
                  <TableCell><Badge variant="outline">{r.action}</Badge></TableCell>
                  <TableCell className="text-xs">{r.entity ? `${r.entity}/${r.entity_id ?? "-"}` : "—"}</TableCell>
                  <TableCell className="max-w-md truncate text-xs text-muted-foreground">
                    {r.meta ? JSON.stringify(r.meta) : ""}
                  </TableCell>
                </TableRow>
              ))}
              {items.length === 0 && !q.isLoading && (
                <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground">No events.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
