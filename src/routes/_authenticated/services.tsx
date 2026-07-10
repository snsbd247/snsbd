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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { formatBDT, formatDate, daysUntil } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/services")({
  component: ServicesPage,
});

type Service = {
  id: string; customer_id: string; type: string; name: string; details: string | null;
  purchase_date: string | null; expiry_date: string | null; cost_price: number | null;
  sale_price: number; status: string; notes: string | null;
};

const empty = {
  customer_id: "", type: "domain", name: "", details: "",
  purchase_date: "", expiry_date: "", cost_price: "0", sale_price: "0", status: "active", notes: "",
};

function ServicesPage() {
  const { role, user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);

  const { data: services, isLoading } = useQuery({
    queryKey: ["services"],
    queryFn: async () => {
      const { data, error } = await supabase.from("services")
        .select("*, profiles(full_name, email)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: customers } = useQuery({
    queryKey: ["customer-list"],
    enabled: role === "admin",
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, full_name, email").order("full_name");
      return data ?? [];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("services").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["services"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{role === "admin" ? "Services" : "My Services"}</h1>
          <p className="text-sm text-muted-foreground">Domains, hosting and software subscriptions.</p>
        </div>
        {role === "admin" && (
          <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="mr-2 h-4 w-4" />Add service</Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                {role === "admin" && <TableHead>Customer</TableHead>}
                <TableHead>Expiry</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
                {role === "admin" && <TableHead className="w-24" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={7} className="text-center py-8 text-sm text-muted-foreground">Loading…</TableCell></TableRow>}
              {!isLoading && (services ?? []).length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-sm text-muted-foreground">No services.</TableCell></TableRow>}
              {(services ?? []).map((s: any) => {
                const days = daysUntil(s.expiry_date);
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}<div className="text-xs text-muted-foreground">{s.details}</div></TableCell>
                    <TableCell><Badge variant="outline" className="capitalize">{s.type}</Badge></TableCell>
                    {role === "admin" && <TableCell>{s.profiles?.full_name ?? s.profiles?.email ?? "—"}</TableCell>}
                    <TableCell>
                      {formatDate(s.expiry_date)}
                      {days != null && (
                        <Badge variant={days < 0 ? "destructive" : days <= 30 ? "secondary" : "outline"} className="ml-2">
                          {days < 0 ? "Expired" : `${days}d`}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{formatBDT(s.sale_price)}</TableCell>
                    <TableCell><Badge variant={s.status === "active" ? "default" : "secondary"} className="capitalize">{s.status}</Badge></TableCell>
                    {role === "admin" && (
                      <TableCell className="text-right">
                        <Button size="icon" variant="ghost" onClick={() => { setEditing(s); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => { if (confirm("Delete?")) del.mutate(s.id); }}><Trash2 className="h-4 w-4" /></Button>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {role === "admin" && (
        <ServiceDialog open={open} onOpenChange={setOpen} editing={editing} customers={customers ?? []} />
      )}
    </div>
  );
}

function ServiceDialog({ open, onOpenChange, editing, customers }: any) {
  const qc = useQueryClient();
  const [f, setF] = useState<any>(empty);

  useEffect(() => {
    if (open) {
      if (editing) setF({
        customer_id: editing.customer_id, type: editing.type, name: editing.name,
        details: editing.details ?? "", purchase_date: editing.purchase_date ?? "",
        expiry_date: editing.expiry_date ?? "", cost_price: String(editing.cost_price ?? "0"),
        sale_price: String(editing.sale_price ?? "0"), status: editing.status, notes: editing.notes ?? "",
      });
      else setF(empty);
    }
  }, [open, editing]);

  const save = useMutation({
    mutationFn: async () => {
      const payload: any = {
        ...f,
        cost_price: Number(f.cost_price) || 0,
        sale_price: Number(f.sale_price) || 0,
        purchase_date: f.purchase_date || null,
        expiry_date: f.expiry_date || null,
      };
      if (editing) {
        const { error } = await supabase.from("services").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("services").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["services"] }); onOpenChange(false); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{editing ? "Edit service" : "Add service"}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div>
            <Label>Customer</Label>
            <Select value={f.customer_id} onValueChange={(v) => setF({ ...f, customer_id: v })}>
              <SelectTrigger><SelectValue placeholder="Choose customer" /></SelectTrigger>
              <SelectContent>{customers.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.full_name ?? c.email}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Select value={f.type} onValueChange={(v) => setF({ ...f, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="domain">Domain</SelectItem>
                  <SelectItem value="hosting">Hosting</SelectItem>
                  <SelectItem value="software">Software</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={f.status} onValueChange={(v) => setF({ ...f, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Name</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="example.com / Business Hosting / CRM License" /></div>
          <div><Label>Details</Label><Input value={f.details} onChange={(e) => setF({ ...f, details: e.target.value })} placeholder="Registrar / plan / version" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Purchase date</Label><Input type="date" value={f.purchase_date} onChange={(e) => setF({ ...f, purchase_date: e.target.value })} /></div>
            <div><Label>Expiry date</Label><Input type="date" value={f.expiry_date} onChange={(e) => setF({ ...f, expiry_date: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Cost (৳)</Label><Input type="number" step="0.01" value={f.cost_price} onChange={(e) => setF({ ...f, cost_price: e.target.value })} /></div>
            <div><Label>Sale price (৳)</Label><Input type="number" step="0.01" value={f.sale_price} onChange={(e) => setF({ ...f, sale_price: e.target.value })} /></div>
          </div>
          <div><Label>Notes</Label><Textarea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
        </div>
        <DialogFooter><Button onClick={() => save.mutate()} disabled={save.isPending || !f.customer_id || !f.name}>Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
