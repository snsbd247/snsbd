import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { formatBDT, formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db-shim";
import { ClickableRow, StopClick } from "@/components/ui/clickable-row";


export const Route = createFileRoute("/_authenticated/invoices")({
  component: InvoicesPage,
});

function statusVariant(s: string) {
  return s === "paid" ? "default" : s === "overdue" ? "destructive" : s === "partial" ? "secondary" : "outline";
}

function InvoicesPage() {
  const { role } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState<string | null>(null);

  const { data: invoices, isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      const { data, error } = await db.from("invoices")
        .select("*, profiles(full_name, email)")
        .order("issue_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: customers } = useQuery({
    queryKey: ["customer-list"],
    enabled: role === "admin",
    queryFn: async () => (await db.from("profiles").select("id, full_name, email").order("full_name")).data ?? [],
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("invoices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["invoices"] }); },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{role === "admin" ? "Invoices" : "My Invoices"}</h1>
          <p className="text-sm text-muted-foreground">Track billing and payments.</p>
        </div>
        {role === "admin" && <Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />New invoice</Button>}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                {role === "admin" && <TableHead>Customer</TableHead>}
                <TableHead>Issued</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">Loading…</TableCell></TableRow>}
              {!isLoading && (invoices ?? []).length === 0 && <TableRow><TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">No invoices.</TableCell></TableRow>}
              {(invoices ?? []).map((i: any) => (
                <ClickableRow key={i.id} to="/invoices/$invoiceId" params={{ invoiceId: i.id }}>
                  <TableCell className="font-mono text-xs text-primary font-semibold">{i.invoice_number}</TableCell>
                  {role === "admin" && <TableCell>{i.profiles?.full_name ?? i.profiles?.email ?? "—"}</TableCell>}
                  <TableCell>{formatDate(i.issue_date)}</TableCell>
                  <TableCell>{formatDate(i.due_date)}</TableCell>
                  <TableCell className="font-medium">{formatBDT(i.total)}</TableCell>
                  <TableCell className="text-success">{formatBDT(i.amount_paid)}</TableCell>
                  <TableCell><Badge variant={statusVariant(i.status)} className="capitalize">{i.status}</Badge></TableCell>
                  <TableCell className="text-right">
                    <StopClick>
                      <Button size="sm" variant="outline" asChild className="mr-1"><Link to="/invoices/$invoiceId" params={{ invoiceId: i.id }}><Eye className="mr-1 h-3.5 w-3.5" />View</Link></Button>
                      {role === "admin" && (
                        <Button size="icon" variant="ghost" className="hover:bg-rose-100 hover:text-rose-700" onClick={() => { if (confirm("Delete?")) del.mutate(i.id); }}><Trash2 className="h-4 w-4" /></Button>
                      )}
                    </StopClick>
                  </TableCell>
                </ClickableRow>
              ))}

            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {role === "admin" && <InvoiceCreateDialog open={open} onOpenChange={setOpen} customers={customers ?? []} />}
      {viewing && <InvoiceViewDialog invoiceId={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}

function InvoiceCreateDialog({ open, onOpenChange, customers }: any) {
  const qc = useQueryClient();
  const [customerId, setCustomerId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<{ description: string; quantity: string; unit_price: string }[]>([
    { description: "", quantity: "1", unit_price: "0" },
  ]);

  useEffect(() => { if (open) { setCustomerId(""); setDueDate(""); setNotes(""); setItems([{ description: "", quantity: "1", unit_price: "0" }]); } }, [open]);

  const subtotal = items.reduce((s, it) => s + Number(it.quantity || 0) * Number(it.unit_price || 0), 0);

  const create = useMutation({
    mutationFn: async () => {
      const invoiceNumber = "INV-" + Date.now().toString().slice(-8);
      const { data: inv, error } = await db.from("invoices").insert({
        customer_id: customerId, invoice_number: invoiceNumber,
        due_date: dueDate || null, subtotal, tax: 0, total: subtotal, notes, status: "sent",
      }).select().single();
      if (error) throw error;
      const rows = items.filter((i) => i.description).map((i) => ({
        invoice_id: inv.id, description: i.description,
        quantity: Number(i.quantity), unit_price: Number(i.unit_price),
        total: Number(i.quantity) * Number(i.unit_price),
      }));
      if (rows.length) {
        const { error: e2 } = await db.from("invoice_items").insert(rows);
        if (e2) throw e2;
      }
    },
    onSuccess: () => { toast.success("Invoice created"); qc.invalidateQueries({ queryKey: ["invoices"] }); onOpenChange(false); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>New invoice</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Customer</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger><SelectValue placeholder="Choose customer" /></SelectTrigger>
                <SelectContent>{customers.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.full_name ?? c.email}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Due date</Label><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
          </div>
          <div>
            <Label>Line items</Label>
            <div className="space-y-2 mt-1">
              {items.map((it, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2">
                  <Input className="col-span-6" placeholder="Description" value={it.description} onChange={(e) => { const n = [...items]; n[idx].description = e.target.value; setItems(n); }} />
                  <Input className="col-span-2" type="number" placeholder="Qty" value={it.quantity} onChange={(e) => { const n = [...items]; n[idx].quantity = e.target.value; setItems(n); }} />
                  <Input className="col-span-3" type="number" placeholder="Unit price" value={it.unit_price} onChange={(e) => { const n = [...items]; n[idx].unit_price = e.target.value; setItems(n); }} />
                  <Button className="col-span-1" size="icon" variant="ghost" onClick={() => setItems(items.filter((_, i) => i !== idx))}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={() => setItems([...items, { description: "", quantity: "1", unit_price: "0" }])}>Add line</Button>
            </div>
          </div>
          <div><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
          <div className="text-right font-semibold">Total: {formatBDT(subtotal)}</div>
        </div>
        <DialogFooter><Button onClick={() => create.mutate()} disabled={!customerId || create.isPending}>Create invoice</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InvoiceViewDialog({ invoiceId, onClose }: { invoiceId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const { role } = useAuth();
  const { data } = useQuery({
    queryKey: ["invoice", invoiceId],
    queryFn: async () => {
      const { data: inv } = await db.from("invoices").select("*, profiles(full_name, email, company, address)").eq("id", invoiceId).single();
      const { data: items } = await db.from("invoice_items").select("*").eq("invoice_id", invoiceId);
      const { data: payments } = await db.from("payments").select("*").eq("invoice_id", invoiceId).order("paid_at", { ascending: false });
      return { inv, items: items ?? [], payments: payments ?? [] };
    },
  });

  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("cash");

  const addPayment = useMutation({
    mutationFn: async () => {
      const amount = Number(payAmount);
      if (!amount) throw new Error("Enter amount");
      const { error } = await db.from("payments").insert({ invoice_id: invoiceId, amount, method: payMethod });
      if (error) throw error;
      // update invoice totals
      const newPaid = Number(data!.inv!.amount_paid) + amount;
      const newStatus = newPaid >= Number(data!.inv!.total) ? "paid" : newPaid > 0 ? "partial" : data!.inv!.status;
      await db.from("invoices").update({ amount_paid: newPaid, status: newStatus }).eq("id", invoiceId);
    },
    onSuccess: () => {
      toast.success("Payment recorded");
      setPayAmount("");
      qc.invalidateQueries({ queryKey: ["invoice", invoiceId] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!data?.inv) return null;
  const balance = Number(data.inv.total) - Number(data.inv.amount_paid);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Invoice {data.inv.invoice_number}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Bill to</div>
              <div className="font-medium">{data.inv.profiles?.full_name ?? data.inv.profiles?.email}</div>
              {data.inv.profiles?.company && <div>{data.inv.profiles.company}</div>}
              {data.inv.profiles?.address && <div className="text-muted-foreground">{data.inv.profiles.address}</div>}
            </div>
            <div className="text-right">
              <div className="text-muted-foreground">Issued</div><div>{formatDate(data.inv.issue_date)}</div>
              <div className="text-muted-foreground mt-2">Due</div><div>{formatDate(data.inv.due_date)}</div>
              <div className="mt-2"><Badge variant={statusVariant(data.inv.status)} className="capitalize">{data.inv.status}</Badge></div>
            </div>
          </div>

          <Table>
            <TableHeader><TableRow><TableHead>Description</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Unit</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
            <TableBody>
              {data.items.map((it: any) => (
                <TableRow key={it.id}>
                  <TableCell>{it.description}</TableCell>
                  <TableCell className="text-right">{it.quantity}</TableCell>
                  <TableCell className="text-right">{formatBDT(it.unit_price)}</TableCell>
                  <TableCell className="text-right font-medium">{formatBDT(it.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="text-right space-y-1">
            <div>Subtotal: <span className="font-medium">{formatBDT(data.inv.subtotal)}</span></div>
            <div className="text-lg font-bold">Total: {formatBDT(data.inv.total)}</div>
            <div className="text-success">Paid: {formatBDT(data.inv.amount_paid)}</div>
            <div className="text-destructive">Balance: {formatBDT(balance)}</div>
          </div>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Payments</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {data.payments.length === 0 && <p className="text-sm text-muted-foreground">No payments recorded.</p>}
              {data.payments.map((p: any) => (
                <div key={p.id} className="flex justify-between text-sm border-b py-1">
                  <span>{formatDate(p.paid_at)} · {p.method}</span>
                  <span className="font-medium">{formatBDT(p.amount)}</span>
                </div>
              ))}
              {role === "admin" && balance > 0 && (
                <div className="flex gap-2 pt-2">
                  <Input placeholder="Amount" type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
                  <Select value={payMethod} onValueChange={setPayMethod}>
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="bank">Bank</SelectItem>
                      <SelectItem value="bkash">bKash</SelectItem>
                      <SelectItem value="nagad">Nagad</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={() => addPayment.mutate()} disabled={addPayment.isPending}>Record</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
