import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { formatBDT } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db-shim";

export const Route = createFileRoute("/_authenticated/service-catalog")({
  component: CatalogPage,
});

const empty = {
  name: "", category: "", description: "",
  price: "0", billing_cycle: "one_time", is_active: true, sort_order: "0",
};

function CatalogPage() {
  const { role } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [f, setF] = useState(empty);

  useEffect(() => {
    if (open) {
      if (editing) {
        setF({
          name: editing.name ?? "",
          category: editing.category ?? "",
          description: editing.description ?? "",
          price: String(editing.price ?? 0),
          billing_cycle: editing.billing_cycle ?? "one_time",
          is_active: editing.is_active ?? true,
          sort_order: String(editing.sort_order ?? 0),
        });
      } else setF(empty);
    }
  }, [open, editing]);

  const { data: rows } = useQuery({
    queryKey: ["service_catalog"],
    queryFn: async () => (await db.from("service_catalog").select("*").order("sort_order").order("name")).data ?? [],
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name: f.name.trim(),
        category: f.category.trim() || null,
        description: f.description.trim() || null,
        price: Number(f.price) || 0,
        billing_cycle: f.billing_cycle,
        is_active: f.is_active,
        sort_order: Number(f.sort_order) || 0,
      };
      const q = editing
        ? db.from("service_catalog").update(payload).eq("id", editing.id)
        : db.from("service_catalog").insert(payload);
      const { error } = await q;
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(editing ? "Service updated" : "Service added");
      qc.invalidateQueries({ queryKey: ["service_catalog"] });
      setOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await db.from("service_catalog").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["service_catalog"] }); },
  });

  if (role !== "admin") return <p className="text-sm text-muted-foreground">Admin only.</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Service Catalog</h1><p className="text-sm text-muted-foreground">Services customers can order from their portal.</p></div>
        <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="mr-2 h-4 w-4" />Add service</Button>
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Name</TableHead><TableHead>Category</TableHead>
            <TableHead>Price</TableHead><TableHead>Cycle</TableHead><TableHead>Status</TableHead>
            <TableHead className="w-24" />
          </TableRow></TableHeader>
          <TableBody>
            {(rows ?? []).map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{r.category ?? "—"}</TableCell>
                <TableCell>{formatBDT(r.price)}</TableCell>
                <TableCell className="capitalize">{r.billing_cycle.replace("_", " ")}</TableCell>
                <TableCell><Badge variant={r.is_active ? "default" : "outline"}>{r.is_active ? "Active" : "Hidden"}</Badge></TableCell>
                <TableCell className="text-right">
                  <Button size="icon" variant="ghost" onClick={() => { setEditing(r); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => { if (confirm("Delete service?")) del.mutate(r.id); }}><Trash2 className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {rows && rows.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">No services yet.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edit service" : "Add service"}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Label>Name</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Category</Label><Input placeholder="e.g. Web Development" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} /></div>
              <div><Label>Sort</Label><Input type="number" value={f.sort_order} onChange={(e) => setF({ ...f, sort_order: e.target.value })} /></div>
            </div>
            <div><Label>Description</Label><Textarea rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Price (BDT)</Label><Input type="number" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} /></div>
              <div>
                <Label>Cycle</Label>
                <Select value={f.billing_cycle} onValueChange={(v) => setF({ ...f, billing_cycle: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="one_time">One time</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2"><Switch checked={f.is_active} onCheckedChange={(v) => setF({ ...f, is_active: v })} /><Label>Show to customers</Label></div>
          </div>
          <DialogFooter><Button onClick={() => save.mutate()} disabled={!f.name || save.isPending}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
