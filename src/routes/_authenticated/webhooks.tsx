import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listWebhooks, createWebhook, deleteWebhook } from "@/lib/webhooks.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

const EVENTS = ["invoice.paid", "invoice.created", "service.created", "service.suspended"];

export const Route = createFileRoute("/_authenticated/webhooks")({
  ssr: false,
  component: WebhooksPage,
});

function WebhooksPage() {
  const list = useServerFn(listWebhooks);
  const create = useServerFn(createWebhook);
  const del = useServerFn(deleteWebhook);
  const { data, refetch } = useQuery({ queryKey: ["webhooks"], queryFn: () => list() });
  const [url, setUrl] = useState("");
  const [selected, setSelected] = useState<string[]>(["invoice.paid"]);
  const [newSecret, setNewSecret] = useState<string | null>(null);

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold">Webhooks</h1>
        <p className="text-sm text-muted-foreground">Get notified when events happen on your account. Payload is signed with HMAC-SHA256 in the <code>X-Webhook-Signature</code> header.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Add endpoint</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">Destination URL</label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/hook" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Events</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {EVENTS.map((ev) => (
                <label key={ev} className="flex items-center gap-1 text-sm">
                  <input type="checkbox" checked={selected.includes(ev)} onChange={(e) => setSelected((s) => e.target.checked ? [...s, ev] : s.filter((x) => x !== ev))} />
                  {ev}
                </label>
              ))}
            </div>
          </div>
          <Button onClick={async () => {
            if (!url) return;
            try { const r = await create({ data: { url, events: selected } }); setNewSecret(r.secret); setUrl(""); refetch(); }
            catch (e: any) { toast.error(e.message); }
          }}>Add webhook</Button>
        </CardContent>
      </Card>

      {newSecret && (
        <Card className="border-primary">
          <CardHeader><CardTitle className="text-primary">Signing secret — save now</CardTitle></CardHeader>
          <CardContent>
            <code className="block p-2 bg-muted rounded text-sm break-all">{newSecret}</code>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => { navigator.clipboard.writeText(newSecret); toast.success("Copied"); }}>Copy</Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Your endpoints</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>URL</TableHead><TableHead>Events</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {(data?.items ?? []).map((w: any) => (
                <TableRow key={w.id}>
                  <TableCell className="max-w-xs truncate"><code className="text-xs">{w.url}</code></TableCell>
                  <TableCell>{w.events.join(", ")}</TableCell>
                  <TableCell>{w.is_active ? <span className="text-green-600">active</span> : <span className="text-muted-foreground">off</span>}</TableCell>
                  <TableCell><Button size="sm" variant="ghost" onClick={async () => { await del({ data: { id: w.id } }); refetch(); }}>Delete</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Recent deliveries</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Event</TableHead><TableHead>Status</TableHead><TableHead>Error</TableHead><TableHead>Time</TableHead></TableRow></TableHeader>
            <TableBody>
              {(data?.deliveries ?? []).map((d: any) => (
                <TableRow key={d.id}>
                  <TableCell><code className="text-xs">{d.event}</code></TableCell>
                  <TableCell>{d.status_code ?? "—"}</TableCell>
                  <TableCell className="max-w-xs truncate text-red-500 text-xs">{d.error ?? ""}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(d.created_at).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
