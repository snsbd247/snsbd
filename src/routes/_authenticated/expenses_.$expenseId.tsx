import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, Save, Trash2, Receipt } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { formatBDT, formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/expenses_/$expenseId")({
  component: ExpenseDetail,
});

function ExpenseDetail() {
  const { expenseId } = Route.useParams();
  const { role } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: expense, isLoading } = useQuery({
    queryKey: ["expense", expenseId],
    queryFn: async () => {
      const { data, error } = await supabase.from("expenses").select("*").eq("id", expenseId).single();
      if (error) throw error;
      return data;
    },
  });

  const [f, setF] = useState<any>(null);
  useEffect(() => {
    if (expense) setF({
      category: expense.category, description: expense.description,
      amount: String(expense.amount), expense_date: expense.expense_date,
      vendor: expense.vendor ?? "", notes: expense.notes ?? "",
    });
  }, [expense]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...f, amount: Number(f.amount) || 0 };
      const { error } = await supabase.from("expenses").update(payload).eq("id", expenseId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["expense", expenseId] }); qc.invalidateQueries({ queryKey: ["expenses"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async () => { const { error } = await supabase.from("expenses").delete().eq("id", expenseId); if (error) throw error; },
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["expenses"] }); navigate({ to: "/expenses" }); },
  });

  if (role !== "admin") return <p className="text-sm text-muted-foreground">Admin only.</p>;
  if (isLoading || !f) return <div className="flex items-center gap-2 text-sm text-muted-foreground p-6"><Loader2 className="h-4 w-4 animate-spin" />Loading…</div>;
  if (!expense) return <div className="space-y-4"><div className="text-sm text-muted-foreground">Expense not found.</div><Button variant="outline" onClick={() => navigate({ to: "/expenses" })}><ArrowLeft className="mr-2 h-4 w-4" />Back</Button></div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <nav className="text-xs text-muted-foreground flex items-center gap-1.5">
        <Link to="/" className="hover:text-foreground">Home</Link><span>/</span>
        <Link to="/expenses" className="hover:text-foreground">Expenses</Link><span>/</span>
        <span className="text-foreground font-medium truncate max-w-[300px]">{expense.description}</span>
      </nav>
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => navigate({ to: "/expenses" })}><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
        <Button variant="destructive" onClick={() => { if (confirm("Delete expense?")) del.mutate(); }}><Trash2 className="mr-2 h-4 w-4" />Delete</Button>
      </div>

      <div className="flex items-center gap-3">
        <Receipt className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">{expense.description}</h1>
        <Badge variant="outline" className="capitalize">{expense.category}</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Amount</div><div className="text-lg font-semibold mt-1">{formatBDT(expense.amount)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Date</div><div className="text-sm font-medium mt-1">{formatDate(expense.expense_date)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Vendor</div><div className="text-sm font-medium mt-1">{expense.vendor ?? "—"}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Edit expense</CardTitle></CardHeader>
        <CardContent className="grid gap-3">
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
          <div><Label>Notes</Label><Textarea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
          <div className="flex justify-end"><Button onClick={() => save.mutate()} disabled={save.isPending}><Save className="mr-2 h-4 w-4" />Save</Button></div>
        </CardContent>
      </Card>
    </div>
  );
}
