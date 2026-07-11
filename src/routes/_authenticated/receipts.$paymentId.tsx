import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, Loader2 } from "lucide-react";
import { useCompanySettings, amountInWords } from "@/lib/company-settings";
import { formatBDT, formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/receipts/$paymentId")({
  component: ReceiptPage,
});

function ReceiptPage() {
  const { paymentId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: company } = useCompanySettings();

  const { data, isLoading } = useQuery({
    queryKey: ["payment-receipt", paymentId],
    queryFn: async () => {
      const { data: pay, error } = await supabase.from("payments").select("*").eq("id", paymentId).single();
      if (error) throw error;
      const { data: inv } = await supabase.from("invoices")
        .select("*, profiles(full_name, company, email), projects(name)")
        .eq("id", pay.invoice_id).single();
      return { pay, inv };
    },
  });

  // Auto-assign receipt number on first view
  const assign = useMutation({
    mutationFn: async () => {
      const d = new Date();
      const seq = Date.now().toString().slice(-4);
      const rn = `SNS-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${seq}`;
      await supabase.from("payments").update({ receipt_number: rn }).eq("id", paymentId);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["payment-receipt", paymentId] }),
  });

  useEffect(() => {
    if (data?.pay && !data.pay.receipt_number && !assign.isPending) assign.mutate();
  }, [data, assign]);

  if (isLoading || !data) {
    return <div className="flex items-center gap-2 text-sm text-muted-foreground p-6"><Loader2 className="h-4 w-4 animate-spin" />Loading receipt…</div>;
  }

  const { pay, inv } = data;
  const total = Number(inv?.total ?? pay.amount);
  const paid = Number(inv?.amount_paid ?? pay.amount);
  const due = Math.max(total - paid, 0);
  const receivedFrom = inv?.projects?.name || inv?.profiles?.company || inv?.profiles?.full_name || inv?.profiles?.email || "—";

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between print:hidden">
        <Button variant="outline" size="sm" onClick={() => (inv ? navigate({ to: "/invoices/$invoiceId", params: { invoiceId: inv.id } }) : navigate({ to: "/invoices" }))}>
          <ArrowLeft className="mr-2 h-4 w-4" />Back to invoice
        </Button>
        <Button onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />Print / PDF</Button>
      </div>

      <div className="receipt bg-white text-slate-900 border shadow-sm print:shadow-none print:border-0 mx-auto" style={{ width: "100%", maxWidth: 900 }}>
        {/* Top ribbon */}
        <div className="relative h-4">
          <div className="absolute inset-y-0 left-0 w-1/2" style={{ background: "#0e3a5f", clipPath: "polygon(0 0, 100% 0, 90% 100%, 0 100%)" }} />
          <div className="absolute inset-y-0 right-0 w-2/3" style={{ background: "#f39c1f", clipPath: "polygon(10% 0, 100% 0, 100% 100%, 0 100%)" }} />
        </div>

        {/* Header */}
        <div className="px-8 pt-6 pb-4 grid grid-cols-3 items-center gap-4">
          <div className="flex items-center gap-3">
            {company?.logo_url ? (
              <img src={company.logo_url} alt={`${company.company_name} logo`} className="h-14 object-contain" />
            ) : (
              <div className="h-14 w-14 rounded-full border-2 flex items-center justify-center font-bold text-xl" style={{ borderColor: "#0e3a5f", color: "#0e3a5f" }}>
                {(company?.company_name ?? "S")[0]}
              </div>
            )}
          </div>
          <div className="text-center">
            <div className="text-3xl font-extrabold tracking-wide" style={{ color: "#0e3a5f" }}>MONEY RECEIPT</div>
          </div>
          <div className="text-right text-sm">
            <div className="text-lg font-bold" style={{ color: "#0e3a5f" }}>{company?.company_name}</div>
            {company?.address && <div className="text-xs text-slate-700 whitespace-pre-line">{company.address}</div>}
            {company?.phone && <div className="text-xs text-slate-700">{company.phone}</div>}
            {company?.email && <div className="text-xs text-slate-700">{company.email}</div>}
          </div>
        </div>

        {/* Ref / Date row */}
        <div className="px-8 grid grid-cols-2 gap-8 text-sm">
          <ReceiptField label="Ref" value={pay.receipt_number ?? "…"} />
          <ReceiptField label="Date" value={formatDate(pay.paid_at)} align="right" />
        </div>

        <div className="mt-3 h-2" style={{ background: "#f39c1f" }} />

        <div className="px-8 py-6 space-y-5 text-sm">
          <ReceiptField label="Received with thanks from" value={receivedFrom} />
          <ReceiptField label="Amount" value={`${formatBDT(pay.amount)}`} />
          <ReceiptField label="In Word" value={`${amountInWords(Number(pay.amount))} taka only`} />
          <ReceiptField label="For" value={inv?.invoice_number ? `Invoice ${inv.invoice_number}${pay.notes ? " — " + pay.notes : ""}` : (pay.notes ?? "—")} />
          <div className="grid grid-cols-3 gap-6">
            <ReceiptField label="Type" value={pay.method ?? "—"} />
            <ReceiptField label="PAID" value={formatBDT(paid)} />
            <ReceiptField label="DUE" value={formatBDT(due)} />
          </div>
          <div className="grid grid-cols-2 gap-6 items-end">
            <div>
              <div className="text-slate-700">Amount =</div>
              <div className="mt-1 inline-block border px-4 py-2 font-semibold">{formatBDT(pay.amount)}</div>
            </div>
            <div className="text-right space-y-8">
              <div>
                <div className="border-b border-dotted border-slate-500 h-6" />
                <div className="text-xs text-slate-600 mt-1">Received by</div>
              </div>
            </div>
          </div>
          <div className="flex justify-end -mt-14">
            <div className="text-right w-64">
              <div className="border-b border-dotted border-slate-500 h-6" />
              <div className="text-xs text-slate-600 mt-1">Authorized Signature</div>
            </div>
          </div>
        </div>

        {/* Bottom ribbon */}
        <div className="relative h-4">
          <div className="absolute inset-0" style={{ background: "#f39c1f" }} />
          <div className="absolute inset-y-0 left-1/2 w-1/3" style={{ background: "#0e3a5f", clipPath: "polygon(20% 0, 80% 0, 100% 100%, 0 100%)" }} />
        </div>

        {company?.footer_copyright && (
          <div className="text-center text-[10px] text-slate-500 py-2">{company.footer_copyright}</div>
        )}
      </div>

      <div className="text-xs text-muted-foreground text-center print:hidden">
        <Link to="/invoices/$invoiceId" params={{ invoiceId: pay.invoice_id }} className="hover:underline">View linked invoice →</Link>
      </div>

      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 12mm; }
          body { background: white !important; }
          .receipt { box-shadow: none !important; }
        }
      `}</style>
    </div>
  );
}

function ReceiptField({ label, value, align = "left" }: { label: string; value: string; align?: "left" | "right" }) {
  return (
    <div className={align === "right" ? "text-right" : ""}>
      <span className="font-semibold mr-2">{label}:</span>
      <span className="border-b border-dotted border-slate-500 pb-0.5">{value}</span>
    </div>
  );
}
