import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Download, Printer, Loader2, Trash2, Receipt as ReceiptIcon } from "lucide-react";
import { downloadElementAsPdf, printElementAsPdf } from "@/lib/pdf";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useCompanySettings, amountInWords } from "@/lib/company-settings";
import { formatBDT, formatDate } from "@/lib/format";
import { db } from "@/lib/db-shim";

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
      <div id="invoice-pdf" className="bg-white text-slate-900 mx-auto shadow-lg print:shadow-none relative overflow-hidden" style={{ width: 900, maxWidth: "none" }}>

        {/* subtle hex background pattern */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none opacity-[0.06]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='56' height='64' viewBox='0 0 56 64'><path d='M28 2 L54 17 L54 47 L28 62 L2 47 L2 17 Z' fill='none' stroke='%23c0392b' stroke-width='1'/></svg>\")",
            backgroundSize: "56px 64px",
          }}
        />

        {/* TOP BAR — dark with red parallelogram overlapping and extending below */}
        <div className="relative h-[84px] w-full" style={{ background: "#1f1f1f" }}>
          <div
            className="absolute left-0 top-0 flex items-center pl-6 z-10"
            style={{
              width: "38%",
              height: "120px",
              background: "#c0392b",
              clipPath: "polygon(0 0, 100% 0, 72% 100%, 0 100%)",
            }}
          >
            {company?.logo_url ? (
              <img src={company.logo_url} alt={`${company.company_name} logo`} className="h-14 object-contain" style={{ marginTop: "-18px" }} />
            ) : (
              <div className="text-white font-bold text-lg px-3" style={{ marginTop: "-18px" }}>
                {company?.company_name ?? "Company"}
              </div>
            )}

          </div>


          <div
            className="absolute inset-y-0 right-6 grid grid-cols-2 gap-x-10 gap-y-2 text-white text-[12px] content-center"
          >
            <span className="flex items-center gap-2 whitespace-nowrap">
              <span className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-full border border-white/70 text-[10px]">✆</span>
              <span className="font-semibold">{company?.phone ?? "+880 0000000000"}</span>
            </span>
            <span className="flex items-center gap-2 whitespace-nowrap">
              <span className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-full border border-white/70 text-[10px]">✉</span>
              <span className="font-semibold">{company?.email ?? "info@example.com"}</span>
            </span>
            <span className="flex items-center gap-2 whitespace-nowrap">
              <span className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-full border border-white/70 text-[10px]">🌐</span>
              <span className="font-semibold">{(company?.facebook_url ?? "www.fb.com/yourpage").replace(/^https?:\/\//, "")}</span>
            </span>
            <span className="flex items-center gap-2 whitespace-nowrap">
              <span className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-full border border-white/70 text-[10px]">🌐</span>
              <span className="font-semibold">{(company?.website ?? "www.yourdomain.com").replace(/^https?:\/\//, "")}</span>
            </span>
          </div>
        </div>

        {/* SALES INVOICE badge */}
        <div className="relative flex justify-center pt-6 pb-4">
          <div className="px-8 py-2 rounded-md text-white font-bold tracking-wide" style={{ background: "#1f1f1f" }}>SALES INVOICE</div>
        </div>

        {/* CUSTOMER / INVOICE META */}
        <div className="relative grid grid-cols-2 gap-6 px-8 pb-4 text-[13px]">
          <div className="space-y-1">
            <div><span className="font-bold">Customer ID:</span> SN-{String(inv.profiles?.id ?? "").slice(0, 6).toUpperCase()}</div>
            <div><span className="font-bold">Customer Name:</span> {inv.profiles?.full_name ?? inv.profiles?.email ?? "—"}</div>
            {inv.profiles?.address && <div><span className="font-bold">Customer Address:</span> {inv.profiles.address}</div>}
            {inv.profiles?.phone && <div><span className="font-bold">Customer Phone:</span> {inv.profiles.phone}</div>}
          </div>
          <div className="space-y-1 text-right">
            <div><span className="font-bold">Invoice No:</span> {inv.invoice_number}</div>
            <div><span className="font-bold">Date:</span> {formatDate(inv.issue_date)}</div>
            <div><span className="font-bold">Invoice by:</span> {company?.company_name ?? "—"}</div>
          </div>
        </div>

        {/* ITEMS TABLE with watermark */}
        <div className="relative px-8 pb-4">
          <div className="relative border border-slate-300">
            {company?.logo_url && (
              <img
                src={company.logo_url}
                alt=""
                aria-hidden
                className="absolute inset-0 m-auto opacity-10 pointer-events-none object-contain"
                style={{ maxHeight: "60%", maxWidth: "60%" }}
              />
            )}
            <table className="w-full text-[13px] border-collapse relative">
              <thead>
                <tr style={{ background: "#dcdcdc" }} className="text-slate-900">
                  <th className="border border-slate-300 py-2 w-12 text-center font-bold">SL</th>
                  <th className="border border-slate-300 py-2 text-center font-bold">Product & Service</th>
                  <th className="border border-slate-300 py-2 w-24 text-center font-bold">Rate</th>
                  <th className="border border-slate-300 py-2 w-20 text-center font-bold">QTY</th>
                  <th className="border border-slate-300 py-2 w-28 text-center font-bold">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((it: any, idx: number) => (
                  <tr key={it.id}>
                    <td className="border border-slate-300 px-2 py-1.5 text-center">{idx + 1}</td>
                    <td className="border border-slate-300 px-2 py-1.5">{it.description}</td>
                    <td className="border border-slate-300 px-2 py-1.5 text-right">{formatBDT(it.unit_price)}</td>
                    <td className="border border-slate-300 px-2 py-1.5 text-center">{it.quantity}</td>
                    <td className="border border-slate-300 px-2 py-1.5 text-right">{formatBDT(it.total)}</td>
                  </tr>
                ))}
                {Array.from({ length: Math.max(0, 8 - data.items.length) }).map((_, i) => (
                  <tr key={`sp-${i}`}>
                    <td className="border border-slate-300 px-2 py-1.5">&nbsp;</td>
                    <td className="border border-slate-300 px-2 py-1.5">&nbsp;</td>
                    <td className="border border-slate-300 px-2 py-1.5">&nbsp;</td>
                    <td className="border border-slate-300 px-2 py-1.5">&nbsp;</td>
                    <td className="border border-slate-300 px-2 py-1.5">&nbsp;</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="text-[13px]">
                <tr>
                  <td colSpan={3} className="border-0" />
                  <td className="border border-slate-300 px-2 py-1.5 text-right font-bold" style={{ background: "#dcdcdc" }}>Total</td>
                  <td className="border border-slate-300 px-2 py-1.5 text-right">{formatBDT(inv.subtotal)}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="border-0" />
                  <td className="border border-slate-300 px-2 py-1.5 text-right font-bold" style={{ background: "#dcdcdc" }}>SD (0%)</td>
                  <td className="border border-slate-300 px-2 py-1.5 text-right">-</td>
                </tr>
                <tr>
                  <td colSpan={3} className="border-0" />
                  <td className="border border-slate-300 px-2 py-1.5 text-right font-bold" style={{ background: "#dcdcdc" }}>VAT (15%)</td>
                  <td className="border border-slate-300 px-2 py-1.5 text-right">{formatBDT(inv.tax)}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="border-0" />
                  <td className="border border-slate-300 px-2 py-1.5 text-right font-bold" style={{ background: "#dcdcdc" }}>Discount</td>
                  <td className="border border-slate-300 px-2 py-1.5 text-right">-</td>
                </tr>
                <tr>
                  <td colSpan={3} className="border-0" />
                  <td className="border border-slate-300 px-2 py-2 text-right font-extrabold" style={{ borderTop: "2px solid #1f1f1f" }}>&nbsp;</td>
                  <td className="border border-slate-300 px-2 py-2 text-right font-extrabold text-[14px]" style={{ borderTop: "2px solid #1f1f1f" }}>{formatBDT(inv.total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* IN WORDS */}
        <div className="relative px-8 py-3 text-[13px]">
          <span className="font-bold">In Word:</span> {amountInWords(Number(inv.total))} Taka Only.
        </div>

        {/* NOTES */}
        {inv.notes && (
          <div className="relative px-8 pb-2 text-[12px] text-slate-700 whitespace-pre-wrap">
            <span className="font-bold">Notes: </span>{inv.notes}
          </div>
        )}

        {/* Signature line */}
        <div className="relative px-8 pt-8 pb-4 text-center text-[12px] text-slate-700">
          This is a software generated invoice and no signature required.
        </div>

        {/* Footer — dark bar with red parallelogram overlapping from right, extending above */}
        <div className="relative h-[64px] w-full mt-8" style={{ background: "#1f1f1f" }}>
          <div
            className="absolute right-0 flex items-center justify-center text-white text-[12px] leading-snug text-center z-10"
            style={{
              width: "50%",
              height: "96px",
              bottom: 0,
              paddingLeft: "18%",
              paddingRight: "24px",
              background: "#c0392b",
              clipPath: "polygon(28% 0, 100% 0, 100% 100%, 0 100%)",
            }}
          >
            {company?.address && (
              <div className="font-semibold break-words whitespace-normal">{company.address}</div>
            )}
          </div>

        </div>

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
