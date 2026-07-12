import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Users, Download, Printer } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { formatBDT } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db-shim";
import { usePagination, PaginationControls } from "@/components/ui/pagination-controls";

export const Route = createFileRoute("/_authenticated/hosting-packages")({
  component: PackagesPage,
});

const empty = {
  name: "", description: "", disk_space: "", bandwidth: "",
  features: "", price: "0", billing_cycle: "yearly", is_active: true, sort_order: "0",
};

function PackagesPage() {
  const { role } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [usageFor, setUsageFor] = useState<any>(null);
  const [f, setF] = useState(empty);

  useEffect(() => {
    if (open) {
      if (editing) {
        setF({
          name: editing.name ?? "",
          description: editing.description ?? "",
          disk_space: editing.disk_space ?? "",
          bandwidth: editing.bandwidth ?? "",
          features: Array.isArray(editing.features) ? editing.features.join("\n") : "",
          price: String(editing.price ?? 0),
          billing_cycle: editing.billing_cycle ?? "yearly",
          is_active: editing.is_active ?? true,
          sort_order: String(editing.sort_order ?? 0),
        });
      } else setF(empty);
    }
  }, [open, editing]);

  const { data: rows } = useQuery({
    queryKey: ["hosting_packages"],
    queryFn: async () => (await db.from("hosting_packages").select("*").order("sort_order").order("price")).data ?? [],
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name: f.name.trim(),
        description: f.description.trim() || null,
        disk_space: f.disk_space.trim() || null,
        bandwidth: f.bandwidth.trim() || null,
        features: f.features.split("\n").map((s) => s.trim()).filter(Boolean),
        price: Number(f.price) || 0,
        billing_cycle: f.billing_cycle,
        is_active: f.is_active,
        sort_order: Number(f.sort_order) || 0,
      };
      const q = editing
        ? db.from("hosting_packages").update(payload).eq("id", editing.id)
        : db.from("hosting_packages").insert(payload);
      const { error } = await q;
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(editing ? "Package updated" : "Package added");
      qc.invalidateQueries({ queryKey: ["hosting_packages"] });
      setOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await db.from("hosting_packages").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["hosting_packages"] }); },
  });

  if (role !== "admin") return <p className="text-sm text-muted-foreground">Admin only.</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Hosting Packages</h1><p className="text-sm text-muted-foreground">Packages that customers can order from their portal.</p></div>
        <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="mr-2 h-4 w-4" />Add package</Button>
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Name</TableHead><TableHead>Disk / Bandwidth</TableHead>
            <TableHead>Price</TableHead><TableHead>Cycle</TableHead><TableHead>Status</TableHead>
            <TableHead className="w-24" />
          </TableRow></TableHeader>
          <TableBody>
            {(rows ?? []).map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">
                  <button className="text-primary hover:underline text-left" onClick={() => setUsageFor(r)}>{r.name}</button>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{r.disk_space ?? "—"} / {r.bandwidth ?? "—"}</TableCell>
                <TableCell>{formatBDT(r.price)}</TableCell>
                <TableCell className="capitalize">{r.billing_cycle}</TableCell>
                <TableCell><Badge variant={r.is_active ? "default" : "outline"}>{r.is_active ? "Active" : "Hidden"}</Badge></TableCell>
                <TableCell className="text-right">
                  <Button size="icon" variant="ghost" title="View usage" onClick={() => setUsageFor(r)}><Users className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => { setEditing(r); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => { if (confirm("Delete package?")) del.mutate(r.id); }}><Trash2 className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {rows && rows.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">No packages yet.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edit package" : "Add package"}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Label>Name</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
            <div><Label>Description</Label><Textarea rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Disk space</Label><Input placeholder="e.g. 10 GB" value={f.disk_space} onChange={(e) => setF({ ...f, disk_space: e.target.value })} /></div>
              <div><Label>Bandwidth</Label><Input placeholder="e.g. 100 GB / mo" value={f.bandwidth} onChange={(e) => setF({ ...f, bandwidth: e.target.value })} /></div>
            </div>
            <div><Label>Features (one per line)</Label><Textarea rows={3} value={f.features} onChange={(e) => setF({ ...f, features: e.target.value })} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Price (BDT)</Label><Input type="number" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} /></div>
              <div>
                <Label>Cycle</Label>
                <Select value={f.billing_cycle} onValueChange={(v) => setF({ ...f, billing_cycle: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                    <SelectItem value="biennial">2 Years</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Sort</Label><Input type="number" value={f.sort_order} onChange={(e) => setF({ ...f, sort_order: e.target.value })} /></div>
            </div>
            <div className="flex items-center gap-2"><Switch checked={f.is_active} onCheckedChange={(v) => setF({ ...f, is_active: v })} /><Label>Show to customers</Label></div>
          </div>
          <DialogFooter><Button onClick={() => save.mutate()} disabled={!f.name || save.isPending}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <UsageDialog pkg={usageFor} onClose={() => setUsageFor(null)} />
    </div>
  );
}

function UsageDialog({ pkg, onClose }: { pkg: any; onClose: () => void }) {
  const { data: rows, isLoading } = useQuery({
    queryKey: ["hosting_package_usage", pkg?.id],
    enabled: !!pkg?.id,
    queryFn: async () => {
      const { data, error } = await db
        .from("services")
        .select("id, name, status, expiry_date, sale_price, profiles(id, full_name, email)")
        .eq("hosting_package_id", pkg.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const list = rows ?? [];

  function exportCsv() {
    const header = ["Hosting", "Customer", "Email", "Expiry", "Price (BDT)", "Status"];
    const escape = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csvBody = list.map((r: any) => [
      r.name, r.profiles?.full_name ?? "", r.profiles?.email ?? "",
      r.expiry_date ?? "", r.sale_price ?? 0, r.status ?? "",
    ].map(escape).join(","));
    const csv = [header.map(escape).join(","), ...csvBody].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(pkg?.name ?? "package").replace(/\s+/g, "_")}_usage.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportPdf() {
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) return;
    const rowsHtml = list.map((r: any) => `
      <tr><td>${r.name ?? ""}</td><td>${r.profiles?.full_name ?? r.profiles?.email ?? "—"}</td>
      <td>${r.expiry_date ?? "—"}</td><td style="text-align:right">${Number(r.sale_price ?? 0).toLocaleString()}</td>
      <td>${r.status ?? ""}</td></tr>`).join("");
    w.document.write(`<html><head><title>${pkg?.name} usage</title>
      <style>body{font-family:system-ui;padding:24px}h1{font-size:18px}table{width:100%;border-collapse:collapse;font-size:12px}
      th,td{border:1px solid #ddd;padding:6px;text-align:left}th{background:#f5f5f5}</style></head>
      <body><h1>Hostings using "${pkg?.name}"</h1>
      <p style="color:#666;font-size:12px">Generated ${new Date().toLocaleString()}</p>
      <table><thead><tr><th>Hosting</th><th>Customer</th><th>Expiry</th><th>Price (BDT)</th><th>Status</th></tr></thead>
      <tbody>${rowsHtml || '<tr><td colspan="5" style="text-align:center;color:#888">No data</td></tr>'}</tbody></table>
      <script>window.onload=()=>window.print()</script></body></html>`);
    w.document.close();
  }

  return (
    <Dialog open={!!pkg} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-2">
            <span>Hostings using “{pkg?.name}”</span>
            {list.length > 0 && (
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={exportCsv}><Download className="mr-2 h-3.5 w-3.5" />CSV</Button>
                <Button size="sm" variant="outline" onClick={exportPdf}><Printer className="mr-2 h-3.5 w-3.5" />PDF</Button>
              </div>
            )}
          </DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>
        ) : list.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No hostings use this package yet.</p>
        ) : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Hosting</TableHead><TableHead>Customer</TableHead>
              <TableHead>Expiry</TableHead><TableHead>Price</TableHead><TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {list.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell><Link to="/services/$serviceId" params={{ serviceId: r.id }} className="text-primary hover:underline">{r.name}</Link></TableCell>
                  <TableCell>{r.profiles?.full_name ?? r.profiles?.email ?? "—"}</TableCell>
                  <TableCell className="text-xs">{r.expiry_date ?? "—"}</TableCell>
                  <TableCell>{formatBDT(r.sale_price)}</TableCell>
                  <TableCell><Badge variant={r.status === "active" ? "default" : "secondary"} className="capitalize">{r.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}
