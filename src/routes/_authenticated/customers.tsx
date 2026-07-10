import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/customers")({
  component: CustomersPage,
});

type Customer = {
  id: string; full_name: string | null; email: string | null; phone: string | null;
  company: string | null; address: string | null; created_at: string;
};

function CustomersPage() {
  const { role } = useAuth();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Customer | null>(null);
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["customers-with-roles"],
    queryFn: async () => {
      const [profiles, roles] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      const roleMap = new Map<string, string[]>();
      (roles.data ?? []).forEach((r) => {
        const arr = roleMap.get(r.user_id) ?? [];
        arr.push(r.role);
        roleMap.set(r.user_id, arr);
      });
      return (profiles.data ?? []).filter((p) => (roleMap.get(p.id) ?? []).includes("customer") || !(roleMap.get(p.id) ?? []).includes("admin"))
        .map((p) => ({ ...p, roles: roleMap.get(p.id) ?? [] }));
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("profiles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["customers-with-roles"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (role !== "admin") return <p className="text-sm text-muted-foreground">Admin only.</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Customers</h1>
          <p className="text-sm text-muted-foreground">Manage your customer records.</p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="mr-2 h-4 w-4" />Add customer</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Added</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">Loading…</TableCell></TableRow>}
              {!isLoading && (data ?? []).length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">No customers yet.</TableCell></TableRow>}
              {(data ?? []).map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">
                    {c.full_name ?? "—"}
                    {c.roles?.includes("admin") && <Badge variant="outline" className="ml-2">admin</Badge>}
                  </TableCell>
                  <TableCell>{c.email ?? "—"}</TableCell>
                  <TableCell>{c.phone ?? "—"}</TableCell>
                  <TableCell>{c.company ?? "—"}</TableCell>
                  <TableCell>{formatDate(c.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(c); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => { if (confirm("Delete this customer? Their auth user remains.")) del.mutate(c.id); }}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <CustomerDialog open={open} onOpenChange={setOpen} editing={editing} />
    </div>
  );
}

function CustomerDialog({ open, onOpenChange, editing }: { open: boolean; onOpenChange: (o: boolean) => void; editing: Customer | null }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", company: "", address: "" });

  // reset on open
  useState(() => {
    if (editing) setForm({
      full_name: editing.full_name ?? "", email: editing.email ?? "", phone: editing.phone ?? "",
      company: editing.company ?? "", address: editing.address ?? ""
    });
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!editing) throw new Error("Use the Sign up flow to create new customer accounts.");
      const { error } = await supabase.from("profiles").update(form).eq("id", editing.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["customers-with-roles"] }); onOpenChange(false); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => {
      onOpenChange(o);
      if (o && editing) setForm({
        full_name: editing.full_name ?? "", email: editing.email ?? "", phone: editing.phone ?? "",
        company: editing.company ?? "", address: editing.address ?? ""
      });
      if (o && !editing) setForm({ full_name: "", email: "", phone: "", company: "", address: "" });
    }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{editing ? "Edit customer" : "Add customer"}</DialogTitle></DialogHeader>
        {!editing && (
          <p className="text-sm text-muted-foreground">
            To onboard a new customer, share the sign-up link. Their profile is created automatically.
            You can then edit their details from this page.
          </p>
        )}
        {editing && (
          <div className="grid gap-3">
            <div><Label>Full name</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
            <div><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div><Label>Company</Label><Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></div>
            <div><Label>Address</Label><Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
          </div>
        )}
        <DialogFooter>
          {editing && <Button onClick={() => save.mutate()} disabled={save.isPending}>Save</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
