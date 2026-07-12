import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { formatBDT, formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db-shim";

export const Route = createFileRoute("/_authenticated/expenses")({
  component: ExpensesPage,
});

const empty = { category: "office", description: "", amount: "0", expense_date: new Date().toISOString().slice(0, 10), vendor: "", notes: "" };

function ExpensesPage() {
  const { role } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const { data } = useQuery({
    queryKey: ["expenses"],
    queryFn: async () => (await db.from("expenses").select("*").order("expense_date", { ascending: false })).data ?? [],
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await db.from("expenses").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["expenses"] }); },
  });

  if (role !== "admin") return <p className="text-sm text-muted-foreground">Admin only.</p>;

  const total = (data ?? []).reduce((s: number, e: any) => s + Number(e.amount), 0);
  const byCat: Record<string, number> = {};
  (data ?? []).forEach((e: any) => { byCat[e.category] = (byCat[e.category] ?? 0) + Number(e.amount); });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Expenses</h1><p className="text-sm text-muted-foreground">Office, server, and other business costs.</p></div>
        <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="mr-2 h-4 w-4" />Add expense</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="p-4"><div className="text-xs uppercase text-muted-foreground">Total</div><div className="mt-1 text-2xl font-bold">{formatBDT(total)}</div></CardContent></Card>
        {Object.entries(byCat).map(([cat, sum]) => (
          <Card key={cat}><CardContent className="p-4"><div className="text-xs uppercase text-muted-foreground capitalize">{cat}</div><div className="mt-1 text-2xl font-bold">{formatBDT(sum)}</div></CardContent></Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Date</TableHead><TableHead>Category</TableHead><TableHead>Description</TableHead>
              <TableHead>Vendor</TableHead><TableHead>Amount</TableHead><TableHead className="w-24" />
            </TableRow></TableHeader>
            <TableBody>
              {(data ?? []).map((e: any) => (
                <TableRow key={e.id}>
                  <TableCell>{formatDate(e.expense_date)}</TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{e.category}</Badge></TableCell>
                  <TableCell><Link to="/expenses/$expenseId" params={{ expenseId: e.id }} className="text-primary hover:underline">{e.description}</Link></TableCell>
                  <TableCell>{e.vendor ?? "—"}</TableCell>
                  <TableCell className="font-medium">{formatBDT(e.amount)}</TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(e); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => { if (confirm("Delete?")) del.mutate(e.id); }}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {(data ?? []).length === 0 && <TableRow><TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">No expenses.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ExpenseDialog open={open} onOpenChange={setOpen} editing={editing} />
    </div>
  );
}

function ExpenseDialog({ open, onOpenChange, editing }: any) {
  const qc = useQueryClient();
  const [f, setF] = useState<any>(empty);
  useEffect(() => {
    if (open) {
      if (editing) setF({ category: editing.category, description: editing.description, amount: String(editing.amount), expense_date: editing.expense_date, vendor: editing.vendor ?? "", notes: editing.notes ?? "" });
      else setF(empty);
    }
  }, [open, editing]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...f, amount: Number(f.amount) || 0 };
      if (editing) { const { error } = await db.from("expenses").update(payload).eq("id", editing.id); if (error) throw error; }
      else { const { error } = await db.from("expenses").insert(payload); if (error) throw error; }
    },
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["expenses"] }); onOpenChange(false); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{editing ? "Edit expense" : "Add expense"}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div>
            <Label>Category</Label>
            <Select value={f.category} onValueChange={(v) => setF({ ...f, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="office">Office</SelectItem>
                <SelectItem value="server">Server</SelectItem>
                <SelectItem value="utility">Utility</SelectItem>
                <SelectItem value="marketing">Marketing</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Description</Label><Input value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Amount (৳)</Label><Input type="number" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></div>
            <div><Label>Date</Label><Input type="date" value={f.expense_date} onChange={(e) => setF({ ...f, expense_date: e.target.value })} /></div>
          </div>
          <div><Label>Vendor</Label><Input value={f.vendor} onChange={(e) => setF({ ...f, vendor: e.target.value })} /></div>
          <div><Label>Notes</Label><Input value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
        </div>
        <DialogFooter><Button onClick={() => save.mutate()} disabled={!f.description || save.isPending}>Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
