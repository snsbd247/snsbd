import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Download, Printer, Loader2, Trash2, Receipt as ReceiptIcon } from "lucide-react";
import { downloadElementAsPdf, printElementAsPdf } from "@/lib/pdf";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useCompanySettings } from "@/lib/company-settings";
import { formatBDT, formatDate } from "@/lib/format";
import { db } from "@/lib/db-shim";
import { InvoiceRender } from "@/components/invoice/invoice-render";
import { useInvoiceTemplates, resolveTheme, type InvoiceTheme } from "@/lib/invoice-theme";

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
      const { data: inv, error } = await db.from("invoices")
        .select("*, profiles(id, full_name, email, company, address, phone), projects(id, name)")
        .eq("id", invoiceId).single();
      if (error) throw error;
      const { data: items } = await db.from("invoice_items")
        .select("*, services(id, name, type)")
        .eq("invoice_id", invoiceId);
      const { data: payments } = await db.from("payments")
        .select("*").eq("invoice_id", invoiceId).order("paid_at", { ascending: false });
      return { inv, items: items ?? [], payments: payments ?? [] };
    },
  });

  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("cash");
  const [pdfBusy, setPdfBusy] = useState(false);

  const addPayment = useMutation({
    mutationFn: async () => {
      const amount = Number(payAmount);
      if (!amount) throw new Error("Enter amount");
      const { error } = await db.from("payments").insert({ invoice_id: invoiceId, amount, method: payMethod });
      if (error) throw error;
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

  const updateStatus = useMutation({
    mutationFn: async (status: string) => {
      const { error } = await db.from("invoices").update({ status: status as any }).eq("id", invoiceId);
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

  const { data: templates } = useInvoiceTemplates();
  const theme = resolveTheme(
    templates,
    company?.invoice_template_key as string | undefined,
    company?.invoice_theme as Partial<InvoiceTheme> | undefined,
    company?.invoice_logo_style as string | undefined,
    company?.invoice_background_url as string | undefined,
    (inv as any).template_key,
    (inv as any).theme_override,
  );

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
          <Button variant="outline" disabled={pdfBusy} onClick={async () => { setPdfBusy(true); try { await printElementAsPdf("invoice-pdf", "a4", "p"); } finally { setPdfBusy(false); } }}>
            {pdfBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}Print
          </Button>
          <Button disabled={pdfBusy} onClick={async () => { setPdfBusy(true); try { await downloadElementAsPdf("invoice-pdf", `${inv.invoice_number}.pdf`, "a4", "p"); } finally { setPdfBusy(false); } }}>
            {pdfBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}Download PDF
          </Button>
        </div>
      </div>

      <div className="w-full overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 sm:overflow-visible print:overflow-visible print:mx-0 print:px-0">
        <InvoiceRender inv={inv as any} items={data.items as any} company={company as any} theme={theme} />
      </div>





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
