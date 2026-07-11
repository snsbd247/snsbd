import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, RefreshCw, PlugZap } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { whmSync, whmTest } from "@/lib/whm.functions";

export const Route = createFileRoute("/_authenticated/whm-servers")({
  component: WhmServersPage,
});

const empty = { name: "", hostname: "", port: "2087", username: "root", api_token: "", auth_type: "token" as "token" | "password", is_active: true };

function WhmServersPage() {
  const { role } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [f, setF] = useState(empty);

  const { data: rows } = useQuery({
    queryKey: ["whm_servers"],
    enabled: role === "admin",
    queryFn: async () => (await (supabase as any).from("whm_servers").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  useEffect(() => {
    if (open) {
      setF(editing ? {
        name: editing.name, hostname: editing.hostname, port: String(editing.port),
        username: editing.username, api_token: editing.api_token,
        auth_type: (editing.auth_type ?? "token") as "token" | "password",
        is_active: editing.is_active,
      } : empty);
    }
  }, [open, editing]);


  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...f, port: Number(f.port) || 2087 };
      const q = editing
        ? (supabase as any).from("whm_servers").update(payload).eq("id", editing.id)
        : (supabase as any).from("whm_servers").insert(payload);
      const { error } = await q;
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["whm_servers"] }); setOpen(false); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await (supabase as any).from("whm_servers").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["whm_servers"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const sync = useMutation({
    mutationFn: async (id: string) => whmSync({ data: { server_id: id } }),
    onSuccess: (r: any) => { toast.success(r.summary || "Synced"); qc.invalidateQueries({ queryKey: ["whm_servers"] }); qc.invalidateQueries({ queryKey: ["services"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Sync failed"),
  });

  const test = useMutation({
    mutationFn: async (id: string) => whmTest({ data: { server_id: id } }),
    onSuccess: (r: any) => toast.success(`Connected · WHM ${r.version}`),
    onError: (e: any) => toast.error(e?.message ?? "Connection failed"),
  });

  if (role !== "admin") return <p className="text-sm text-muted-foreground">Admin only.</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">WHM Servers</h1>
          <p className="text-sm text-muted-foreground">Add your WHM servers and sync cPanel accounts as customer hostings.</p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="mr-2 h-4 w-4" />Add server</Button>
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Name</TableHead><TableHead>Hostname</TableHead><TableHead>User</TableHead>
            <TableHead>Last sync</TableHead><TableHead>Status</TableHead><TableHead className="w-48" />
          </TableRow></TableHeader>
          <TableBody>
            {(rows ?? []).map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell className="text-xs font-mono">{r.hostname}:{r.port}</TableCell>
                <TableCell className="text-xs">{r.username}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {r.last_sync_at ? new Date(r.last_sync_at).toLocaleString() : "—"}
                  {r.last_sync_result && <div className="text-[11px]">{r.last_sync_result}</div>}
                </TableCell>
                <TableCell><Badge variant={r.is_active ? "default" : "outline"}>{r.is_active ? "Active" : "Off"}</Badge></TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" onClick={() => test.mutate(r.id)} disabled={test.isPending}><PlugZap className="h-4 w-4 mr-1" />Test</Button>
                  <Button size="sm" variant="ghost" onClick={() => sync.mutate(r.id)} disabled={sync.isPending}><RefreshCw className={`h-4 w-4 mr-1 ${sync.isPending ? "animate-spin" : ""}`} />Sync</Button>
                  <Button size="icon" variant="ghost" onClick={() => { setEditing(r); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => { if (confirm("Delete server?")) del.mutate(r.id); }}><Trash2 className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {rows && rows.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-sm text-muted-foreground">No WHM servers yet.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit WHM server" : "Add WHM server"}</DialogTitle>
            <DialogDescription>Create an API token in WHM → Manage API Tokens with the <b>root</b> user (or any reseller with account, passwd, and create_user_session privileges).</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div><Label>Name</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Main server" /></div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2"><Label>Hostname / IP</Label><Input value={f.hostname} onChange={(e) => setF({ ...f, hostname: e.target.value })} placeholder="server.example.com" /></div>
              <div><Label>Port</Label><Input type="number" value={f.port} onChange={(e) => setF({ ...f, port: e.target.value })} /></div>
            </div>
            <div><Label>Username</Label><Input value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} /></div>
            <div><Label>API token</Label><Input type="password" value={f.api_token} onChange={(e) => setF({ ...f, api_token: e.target.value })} autoComplete="new-password" /></div>
            <div className="flex items-center gap-2"><Switch checked={f.is_active} onCheckedChange={(v) => setF({ ...f, is_active: v })} /><Label>Active</Label></div>
          </div>
          <DialogFooter><Button onClick={() => save.mutate()} disabled={save.isPending || !f.name || !f.hostname || !f.api_token}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
