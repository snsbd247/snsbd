import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Printer, Loader2, Trash2, Receipt as ReceiptIcon } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useCompanySettings } from "@/lib/company-settings";
import { formatBDT, formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/invoices_/$invoiceId")({
  component: InvoiceDetailPage,
});

function statusVariant(s: string) {
  return s === "paid" ? "default" : s === "overdue" ? "destructive" : s === "partial" ? "secondary" : "outline";
}

function InvoiceDetailPage() {
  const { invoiceId } = Route.useParams();
  const { role } = useAuth();
  const { data: company } = useCompanySettings();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isAdmin = role === "admin";

  const { data, isLoading } = useQuery({
    queryKey: ["invoice", invoiceId],
    queryFn: async () => {
      const { data: inv, error } = await supabase.from("invoices")
        .select("*, profiles(id, full_name, email, company, address, phone), projects(id, name)")
        .eq("id", invoiceId).single();
      if (error) throw error;
      const { data: items } = await supabase.from("invoice_items")
        .select("*, services(id, name, type)")
        .eq("invoice_id", invoiceId);
      const { data: payments } = await supabase.from("payments")
        .select("*").eq("invoice_id", invoiceId).order("paid_at", { ascending: false });
      return { inv, items: items ?? [], payments: payments ?? [] };
    },
  });

  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("cash");

  const addPayment = useMutation({
    mutationFn: async () => {
      const amount = Number(payAmount);
      if (!amount) throw new Error("Enter amount");
      const { error } = await supabase.from("payments").insert({ invoice_id: invoiceId, amount, method: payMethod });
      if (error) throw error;
      const newPaid = Number(data!.inv!.amount_paid) + amount;
      const newStatus = newPaid >= Number(data!.inv!.total) ? "paid" : newPaid > 0 ? "partial" : data!.inv!.status;
      await supabase.from("invoices").update({ amount_paid: newPaid, status: newStatus }).eq("id", invoiceId);
    },
    onSuccess: () => {
      toast.success("Payment recorded");
      setPayAmount("");
      qc.invalidateQueries({ queryKey: ["invoice", invoiceId] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: async (status: string) => {
      const { error } = await supabase.from("invoices").update({ status: status as any }).eq("id", invoiceId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Status updated"); qc.invalidateQueries({ queryKey: ["invoice", invoiceId] }); qc.invalidateQueries({ queryKey: ["invoices"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <div className="flex items-center gap-2 text-sm text-muted-foreground p-6"><Loader2 className="h-4 w-4 animate-spin" />Loading invoice…</div>;
  if (!data?.inv) return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">Invoice not found.</div>
      <Button variant="outline" onClick={() => navigate({ to: "/invoices" })}><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
    </div>
  );

  const inv = data.inv;
  const balance = Number(inv.total) - Number(inv.amount_paid);

  return (
    <div className="space-y-6 max-w-4xl">
      <nav className="text-xs text-muted-foreground flex items-center gap-1.5 print:hidden" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-foreground">Home</Link>
        <span>/</span>
        <Link to="/invoices" className="hover:text-foreground">Invoices</Link>
        <span>/</span>
        <span className="text-foreground font-medium">{inv.invoice_number}</span>
      </nav>
      <div className="flex items-center justify-between print:hidden">
        <Button variant="outline" size="sm" onClick={() => navigate({ to: "/invoices" })}>
          <ArrowLeft className="mr-2 h-4 w-4" />Back
        </Button>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Select value={inv.status} onValueChange={(v) => updateStatus.mutate(v)}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["draft","sent","paid","partial","overdue","cancelled"].map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Button onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />Download PDF</Button>
        </div>
      </div>

      <Card className="print:shadow-none print:border-0 overflow-hidden border-0 shadow-lg">
        <div className="h-3 w-full" style={{ background: "linear-gradient(90deg, #0e3a5f 0%, #1e6091 50%, #f39c1f 100%)" }} />
        <CardContent className="p-8 space-y-6 bg-gradient-to-br from-white via-slate-50 to-orange-50/30">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight" style={{ color: "#0e3a5f" }}>INVOICE</h1>
              <div className="mt-1 font-mono text-sm text-muted-foreground">{inv.invoice_number}</div>
              <Badge variant={statusVariant(inv.status)} className="capitalize mt-2">{inv.status}</Badge>
            </div>
            <div className="text-right">
              {company?.logo_url && <img src={company.logo_url} alt={`${company.company_name} logo`} className="h-10 ml-auto mb-2 object-contain" />}
              <div className="font-semibold">{company?.company_name ?? "Company"}</div>
              {company?.address && <div className="text-xs text-muted-foreground whitespace-pre-line">{company.address}</div>}
              {company?.phone && <div className="text-xs text-muted-foreground">{company.phone}</div>}
              {company?.email && <div className="text-xs text-muted-foreground">{company.email}</div>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 text-sm">
            <div>
              <div className="text-muted-foreground uppercase text-xs tracking-wider">Bill to</div>
              <div className="font-medium mt-1">{inv.profiles?.full_name ?? inv.profiles?.email}</div>
              {inv.profiles?.company && <div>{inv.profiles.company}</div>}
              {inv.profiles?.address && <div className="text-muted-foreground">{inv.profiles.address}</div>}
              {inv.profiles?.phone && <div className="text-muted-foreground">{inv.profiles.phone}</div>}
              {inv.profiles?.email && <div className="text-muted-foreground">{inv.profiles.email}</div>}
            </div>
            <div className="text-right">
              <div><span className="text-muted-foreground">Issued:</span> {formatDate(inv.issue_date)}</div>
              <div><span className="text-muted-foreground">Due:</span> {formatDate(inv.due_date)}</div>
              {inv.projects && (
                <div className="mt-2"><span className="text-muted-foreground">Project:</span>{" "}
                  <Link to="/projects/$projectId" params={{ projectId: inv.projects.id }} className="hover:underline print:no-underline">{inv.projects.name}</Link>
                </div>
              )}
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow style={{ background: "#0e3a5f" }} className="hover:bg-[#0e3a5f]">
                <TableHead className="text-white font-semibold">Description</TableHead>
                <TableHead className="text-white font-semibold">Linked</TableHead>
                <TableHead className="text-right text-white font-semibold">Qty</TableHead>
                <TableHead className="text-right text-white font-semibold">Unit</TableHead>
                <TableHead className="text-right text-white font-semibold">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((it: any) => (
                <TableRow key={it.id}>
                  <TableCell>{it.description}</TableCell>
                  <TableCell className="text-xs">
                    {it.services ? (
                      <Link to="/services/$serviceId" params={{ serviceId: it.services.id }} className="hover:underline print:no-underline">
                        <Badge variant="outline" className="capitalize mr-1">{it.services.type}</Badge>
                        {it.services.name}
                      </Link>
                    ) : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-right">{it.quantity}</TableCell>
                  <TableCell className="text-right">{formatBDT(it.unit_price)}</TableCell>
                  <TableCell className="text-right font-medium">{formatBDT(it.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex justify-end">
            <div className="w-64 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatBDT(inv.subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>{formatBDT(inv.tax)}</span></div>
              <div className="flex justify-between font-bold text-base border-t pt-1"><span>Total</span><span>{formatBDT(inv.total)}</span></div>
              <div className="flex justify-between text-success"><span>Paid</span><span>{formatBDT(inv.amount_paid)}</span></div>
              <div className="flex justify-between font-semibold text-destructive"><span>Balance</span><span>{formatBDT(balance)}</span></div>
            </div>
          </div>

          {inv.notes && (
            <div className="text-sm border-t pt-4">
              <div className="text-muted-foreground uppercase text-xs tracking-wider mb-1">Notes</div>
              <p className="whitespace-pre-wrap">{inv.notes}</p>
            </div>
          )}

          {company?.footer_copyright && (
            <div className="text-center text-[11px] text-muted-foreground border-t pt-3">{company.footer_copyright}</div>
          )}
        </CardContent>
      </Card>

      <Card className="print:hidden">
        <CardHeader><CardTitle className="text-base">Payments</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {data.payments.length === 0 && <p className="text-sm text-muted-foreground">No payments recorded.</p>}
          {data.payments.map((p: any) => (
            <div key={p.id} className="flex items-center justify-between text-sm border-b py-1.5">
              <span>{formatDate(p.paid_at)} · <span className="capitalize">{p.method}</span>{p.receipt_number && <span className="text-xs text-muted-foreground ml-2 font-mono">{p.receipt_number}</span>}</span>
              <div className="flex items-center gap-2">
                <span className="font-medium">{formatBDT(p.amount)}</span>
                <Button asChild size="sm" variant="outline">
                  <Link to="/receipts/$paymentId" params={{ paymentId: p.id }}>
                    <ReceiptIcon className="mr-1 h-3.5 w-3.5" />Receipt
                  </Link>
                </Button>
              </div>
            </div>
          ))}
          {isAdmin && balance > 0 && (
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

      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 12mm; }
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}

// keep unused import silenced when tree-shaken variants change
void Trash2;
