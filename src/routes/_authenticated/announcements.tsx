import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { listAnnouncements, sendAnnouncement } from "@/lib/announcements.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/announcements")({ component: AnnouncementsPage });

function AnnouncementsPage() {
  const qc = useQueryClient();
  const list = useServerFn(listAnnouncements);
  const send = useServerFn(sendAnnouncement);
  const q = useQuery({ queryKey: ["announcements"], queryFn: () => list() });

  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [segment, setSegment] = useState<"all" | "customers" | "admins">("customers");

  const m = useMutation({
    mutationFn: () => send({ data: { subject, body, segment } }),
    onSuccess: (r: any) => {
      toast.success(`Sent to ${r.sent}/${r.total}${r.failed ? ` (${r.failed} failed)` : ""}`);
      setSubject(""); setBody("");
      qc.invalidateQueries({ queryKey: ["announcements"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const items = (q.data as any)?.items ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Announcements</h1>
        <p className="text-sm text-muted-foreground">Send bulk email to customers or admins.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Compose</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Segment</Label>
            <select className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={segment} onChange={(e) => setSegment(e.target.value as any)}>
              <option value="customers">Customers only</option>
              <option value="admins">Admins only</option>
              <option value="all">Everyone</option>
            </select>
          </div>
          <div><Label>Subject</Label><Input value={subject} onChange={(e) => setSubject(e.target.value)} /></div>
          <div><Label>Body (HTML allowed)</Label><Textarea rows={10} value={body} onChange={(e) => setBody(e.target.value)} /></div>
          <Button disabled={!subject || !body || m.isPending} onClick={() => m.mutate()}>
            {m.isPending ? "Sending…" : "Send announcement"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>History ({items.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>Segment</TableHead>
                <TableHead>Sent</TableHead>
                <TableHead>Failed</TableHead>
                <TableHead>When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((a: any) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.subject}</TableCell>
                  <TableCell><Badge variant="outline">{a.segment}</Badge></TableCell>
                  <TableCell>{a.sent_count}</TableCell>
                  <TableCell>{a.fail_count}</TableCell>
                  <TableCell className="text-xs">{a.sent_at ? new Date(a.sent_at).toLocaleString() : "—"}</TableCell>
                </TableRow>
              ))}
              {items.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground">No announcements sent.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
