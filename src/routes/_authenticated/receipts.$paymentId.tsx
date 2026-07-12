import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
import { downloadElementAsPdf } from "@/lib/pdf";
import { useCompanySettings, amountInWords } from "@/lib/company-settings";
import { formatBDT, formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/receipts/$paymentId")({
  component: ReceiptPage,
});

const NAVY = "#0e3a5f";
const ORANGE = "#f39c1f";

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

  const assign = useMutation({
    mutationFn: async () => {
      const d = new Date();
      const seq = Date.now().toString().slice(-3);
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
    <div className="space-y-4 max-w-[1100px] mx-auto">
      <div className="flex items-center justify-between print:hidden">
        <Button variant="outline" size="sm" onClick={() => (inv ? navigate({ to: "/invoices/$invoiceId", params: { invoiceId: inv.id } }) : navigate({ to: "/invoices" }))}>
          <ArrowLeft className="mr-2 h-4 w-4" />Back to invoice
        </Button>
        <Button onClick={() => downloadElementAsPdf("receipt-pdf", `${pay.receipt_number ?? "receipt"}.pdf`, "a5", "l")}><Download className="mr-2 h-4 w-4" />Download PDF</Button>
      </div>

      <div id="receipt-pdf" className="receipt bg-white text-slate-900 mx-auto" style={{ width: "100%", maxWidth: 1080 }}>
        {/* TOP BAND: navy (left ~38%) with slash into orange (right) */}
        <div className="relative h-[52px] w-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0"
            style={{ width: "42%", background: NAVY, clipPath: "polygon(0 0, 100% 0, 88% 100%, 0 100%)" }}
          />
          <div
            className="absolute inset-y-0 right-0"
            style={{ width: "60%", background: ORANGE, clipPath: "polygon(6% 0, 100% 0, 100% 100%, 0 100%)" }}
          />
        </div>

        {/* HEADER ROW */}
        <div className="grid grid-cols-[1fr_1.4fr_1fr] items-center gap-6 px-10 pt-6 pb-2">
          <div className="flex items-center">
            {company?.logo_url ? (
              <img src={company.logo_url} alt={`${company.company_name} logo`} className="h-16 object-contain" />
            ) : (
              <div className="flex items-center gap-2">
                <div className="h-14 w-14 rounded-full border-[3px] flex items-center justify-center text-2xl font-black" style={{ borderColor: "#c0392b", color: "#c0392b" }}>S</div>
                <div>
                  <div className="text-3xl font-black tracking-tight" style={{ color: NAVY }}>SNS</div>
                  <div className="text-[9px] font-semibold tracking-[0.2em]" style={{ color: "#c0392b" }}>SYNC & SOLUTIONS IT</div>
                </div>
              </div>
            )}
          </div>
          <div className="text-center">
            <div className="text-[42px] leading-none font-extrabold tracking-wide" style={{ color: NAVY }}>MONEY RECEIPT</div>
          </div>
          <div className="text-left text-[13px] leading-tight">
            <div className="text-[18px] font-bold" style={{ color: NAVY }}>{company?.company_name}</div>
            {company?.address && <div className="text-slate-700 whitespace-pre-line">{company.address}</div>}
            {company?.phone && <div className="text-slate-700">{company.phone}</div>}
            {company?.email && <div className="text-slate-700">{company.email}</div>}
          </div>
        </div>

        {/* REF / DATE ROW */}
        <div className="grid grid-cols-2 gap-10 px-10 pt-3 pb-4 text-[15px]">
          <Field label="Ref" value={pay.receipt_number ?? "…"} />
          <Field label="Date" value={formatDate(pay.paid_at)} />
        </div>

        {/* ORANGE DIVIDER */}
        <div className="h-[14px] w-full" style={{ background: ORANGE }} />

        {/* BODY */}
        <div className="px-10 py-6 space-y-5 text-[15px]">
          <Field label="Received with thanks from" value={receivedFrom} />
          <Field label="Amount" value={formatBDT(pay.amount)} />
          <Field label="In Word" value={`${amountInWords(Number(pay.amount))} Taka Only.`} />
          <div className="grid grid-cols-[2fr_1fr] gap-8">
            <Field label="For" value={inv?.invoice_number ? `Invoice ${inv.invoice_number}${pay.notes ? " — " + pay.notes : ""}` : (pay.notes ?? "—")} />
            <Field label="Branch" value="" />
          </div>
          <div className="grid grid-cols-3 gap-8">
            <Field label="Type" value={pay.method ?? "—"} capitalize />
            <Field label="PAID" value={formatBDT(paid)} />
            <Field label="DUE" value={due > 0 ? `${formatBDT(due)} (After Complete)` : formatBDT(0)} />
          </div>

          {/* AMOUNT + SIGNATURES */}
          <div className="grid grid-cols-3 gap-8 items-end pt-4">
            <div className="flex items-end gap-3">
              <span className="font-semibold">Amount =</span>
              <div className="border border-slate-400 px-5 py-2 font-semibold min-w-[160px] text-center">{formatBDT(pay.amount)}</div>
            </div>
            <div className="text-center">
              <div className="border-b border-dotted border-slate-500 h-6 mx-4" />
              <div className="text-[13px] text-slate-700 mt-1">Received by</div>
            </div>
            <div className="text-center">
              <div className="border-b border-dotted border-slate-500 h-6 mx-4" />
              <div className="text-[13px] text-slate-700 mt-1">Authorized Signature</div>
            </div>
          </div>
        </div>

        {/* BOTTOM BAND: orange with navy notch on right */}
        <div className="relative h-[36px] w-full overflow-hidden">
          <div className="absolute inset-0" style={{ background: ORANGE }} />
          <div
            className="absolute inset-y-0 right-0"
            style={{ width: "22%", background: NAVY, clipPath: "polygon(18% 0, 100% 0, 100% 100%, 0 100%)" }}
          />
        </div>

        {company?.footer_copyright && (
          <div className="text-center text-[10px] text-slate-500 py-2 print:pb-0">{company.footer_copyright}</div>
        )}
      </div>

      <div className="text-xs text-muted-foreground text-center print:hidden">
        <Link to="/invoices/$invoiceId" params={{ invoiceId: pay.invoice_id }} className="text-primary hover:underline">View linked invoice →</Link>
      </div>

      <style>{`
        @media print {
          @page { size: A5 landscape; margin: 6mm; }
          body { background: white !important; }
          .receipt { box-shadow: none !important; border: 0 !important; width: 100% !important; max-width: 100% !important; }
        }
      `}</style>
    </div>
  );
}

function Field({ label, value, capitalize = false }: { label: string; value: string; capitalize?: boolean }) {
  return (
    <div className="flex items-end gap-2 w-full">
      <span className="font-semibold whitespace-nowrap">{label}</span>
      <span className="flex-1 border-b border-dotted border-slate-500 pb-0.5 min-h-[1.4em]">
        <span className={capitalize ? "capitalize" : ""}>{value}</span>
      </span>
    </div>
  );
}
