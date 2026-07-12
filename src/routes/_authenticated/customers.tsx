import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Eye } from "lucide-react";
import { ClickableRow, StopClick } from "@/components/ui/clickable-row";
import { usePagination, PaginationControls } from "@/components/ui/pagination-controls";

import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { useServerFn } from "@tanstack/react-start";
import { createCustomer } from "@/lib/customers.functions";
import { db } from "@/lib/db-shim";

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
        db.from("profiles").select("*").order("created_at", { ascending: false }),
        db.from("user_roles").select("user_id, role"),
      ]);
      const roleMap = new Map<string, string[]>();
      (roles.data ?? []).forEach((r: any) => {
        const arr = roleMap.get(r.user_id) ?? [];
        arr.push(r.role);
        roleMap.set(r.user_id, arr);
      });
      return (profiles.data ?? []).filter((p: any) => (roleMap.get(p.id) ?? []).includes("customer") || !(roleMap.get(p.id) ?? []).includes("admin"))
        .map((p: any) => ({ ...p, roles: roleMap.get(p.id) ?? [] }));
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("profiles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["customers-with-roles"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (role !== "admin") return <p className="text-sm text-muted-foreground">Admin only.</p>;

  const customers = (data ?? []) as any[];
  const total = customers.length;
  const withCompany = customers.filter((c) => c.company).length;
  const withPhone = customers.filter((c) => c.phone).length;
  const pg = usePagination(customers);

  const gradients = [
    "from-fuchsia-500 to-pink-500",
    "from-sky-500 to-indigo-500",
    "from-emerald-500 to-teal-500",
    "from-amber-500 to-orange-500",
    "from-violet-500 to-purple-500",
    "from-rose-500 to-red-500",
  ];
  const initials = (name: string | null, email: string | null) => {
    const src = (name || email || "?").trim();
    const parts = src.split(/\s+/);
    return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || src[0]?.toUpperCase() || "?";
  };

  return (
    <div className="space-y-6">
      {/* Colorful gradient header */}
      <div className="relative overflow-hidden rounded-2xl p-6 sm:p-8 text-white shadow-lg bg-gradient-to-br from-indigo-600 via-fuchsia-600 to-pink-500">
        <div className="absolute -top-16 -right-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Customers</h1>
            <p className="text-sm text-white/80 mt-1">Manage your customer records with style.</p>
          </div>
          <Button
            onClick={() => { setEditing(null); setOpen(true); }}
            className="bg-white text-indigo-700 hover:bg-white/90 shadow-md font-semibold"
          >
            <Plus className="mr-2 h-4 w-4" />Add customer
          </Button>
        </div>
        <div className="relative mt-6 grid grid-cols-3 gap-3">
          {[
            { label: "Total", value: total, tone: "bg-white/15" },
            { label: "With company", value: withCompany, tone: "bg-white/15" },
            { label: "With phone", value: withPhone, tone: "bg-white/15" },
          ].map((s) => (
            <div key={s.label} className={`${s.tone} backdrop-blur-sm rounded-xl px-4 py-3 border border-white/20`}>
              <div className="text-2xl font-bold leading-none">{s.value}</div>
              <div className="text-[11px] uppercase tracking-wider text-white/80 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <Card className="border-0 shadow-md overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-gradient-to-r from-slate-50 to-slate-100 hover:bg-slate-100 dark:from-slate-900 dark:to-slate-800">
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
              {!isLoading && customers.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-12">No customers yet. Add your first one! ✨</TableCell></TableRow>}
              {customers.map((c: any, i: number) => {
                const grad = gradients[i % gradients.length];
                return (
                  <ClickableRow key={c.id} to="/customers/$customerId" params={{ customerId: c.id }}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <div className={`h-9 w-9 shrink-0 rounded-full bg-gradient-to-br ${grad} text-white flex items-center justify-center text-xs font-bold shadow-sm ring-2 ring-white dark:ring-slate-900`}>
                          {initials(c.full_name, c.email)}
                        </div>
                        <div className="min-w-0">
                          <span className="text-primary font-semibold">{c.full_name ?? "—"}</span>
                          {c.roles?.includes("admin") && <Badge variant="outline" className="ml-2 border-amber-400 text-amber-600">admin</Badge>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-600 dark:text-slate-300">{c.email ?? "—"}</TableCell>
                    <TableCell>
                      {c.phone ? (
                        <span className="inline-flex rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 px-2.5 py-0.5 text-xs font-medium">{c.phone}</span>
                      ) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      {c.company ? (
                        <span className="inline-flex rounded-full bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 px-2.5 py-0.5 text-xs font-medium">{c.company}</span>
                      ) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-slate-500 dark:text-slate-400 text-sm">{formatDate(c.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <StopClick>
                        <Button size="icon" variant="ghost" asChild className="hover:bg-sky-100 hover:text-sky-700 dark:hover:bg-sky-950/40"><Link to="/customers/$customerId" params={{ customerId: c.id }}><Eye className="h-4 w-4" /></Link></Button>
                        <Button size="icon" variant="ghost" className="hover:bg-indigo-100 hover:text-indigo-700 dark:hover:bg-indigo-950/40" onClick={() => { setEditing(c); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" className="hover:bg-rose-100 hover:text-rose-700 dark:hover:bg-rose-950/40" onClick={() => { if (confirm("Delete this customer? Their auth user remains.")) del.mutate(c.id); }}><Trash2 className="h-4 w-4" /></Button>
                      </StopClick>
                    </TableCell>
                  </ClickableRow>
                );
              })}

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
  const create = useServerFn(createCustomer);
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", company: "", address: "" });

  useEffect(() => {
    if (!open) return;
    if (editing) setForm({
      full_name: editing.full_name ?? "", email: editing.email ?? "", phone: editing.phone ?? "",
      company: editing.company ?? "", address: editing.address ?? "",
    });
    else setForm({ full_name: "", email: "", phone: "", company: "", address: "" });
  }, [open, editing]);

  const save = useMutation({
    mutationFn: async () => {
      if (editing) {
        const { error } = await db.from("profiles").update(form).eq("id", editing.id);
        if (error) throw error;
      } else {
        if (!form.email) throw new Error("Email is required");
        await create({ data: form });
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Saved" : "Customer added");
      qc.invalidateQueries({ queryKey: ["customers-with-roles"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{editing ? "Edit customer" : "Add customer"}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div><Label>Full name</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
          <div><Label>Email {!editing && <span className="text-destructive">*</span>}</Label><Input type="email" disabled={!!editing} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="customer@example.com" /></div>
          <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div><Label>Company</Label><Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></div>
          <div><Label>Address</Label><Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
          {!editing && <p className="text-xs text-muted-foreground">A login account is created for this customer. They can sign in later using password reset on the sign-in page.</p>}
        </div>
        <DialogFooter>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>{editing ? "Save" : "Add customer"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// silence unused
void DialogTrigger;
