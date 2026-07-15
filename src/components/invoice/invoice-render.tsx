import { formatBDT, formatDate } from "@/lib/format";
import { amountInWords } from "@/lib/company-settings";
import type { InvoiceTheme } from "@/lib/invoice-theme";
import { logoFilter } from "@/lib/invoice-theme";

export interface InvoiceRenderData {
  inv: {
    invoice_number: string;
    issue_date: string;
    subtotal: number | string;
    tax: number | string;
    total: number | string;
    notes?: string | null;
    profiles?: {
      id?: string;
      full_name?: string | null;
      email?: string | null;
      address?: string | null;
      phone?: string | null;
    } | null;
  };
  items: Array<{
    id: string;
    description: string;
    unit_price: number | string;
    quantity: number | string;
    total: number | string;
  }>;
  company?: {
    company_name?: string | null;
    logo_url?: string | null;
    email?: string | null;
    phone?: string | null;
    facebook_url?: string | null;
    website?: string | null;
    address?: string | null;
  } | null;
  theme: InvoiceTheme;
  id?: string;
}

export function InvoiceRender({ inv, items, company, theme, id = "invoice-pdf" }: InvoiceRenderData) {
  const fontHeading = `"${theme.fontHeading}", ui-sans-serif, system-ui`;
  const fontBody = `"${theme.fontBody}", ui-sans-serif, system-ui`;
  const logoStyle = theme.logoStyle;

  const LogoEl = company?.logo_url ? (
    logoStyle === "badge" ? (
      <div className="flex items-center justify-center rounded-lg bg-white/95 px-3 py-1.5 shadow" style={{ marginTop: "-18px" }}>
        <img src={company.logo_url} alt="logo" className="h-11 object-contain" crossOrigin="anonymous" />
      </div>
    ) : (
      <img
        src={company.logo_url}
        alt="logo"
        crossOrigin="anonymous"
        className="h-14 object-contain"
        style={{ marginTop: "-18px", filter: logoFilter(logoStyle) }}
      />
    )
  ) : (
    <div className="text-white font-bold text-lg px-3" style={{ marginTop: "-18px", fontFamily: fontHeading }}>
      {company?.company_name ?? "Company"}
    </div>
  );

  return (
    <div
      id={id}
      className="bg-white text-slate-900 mx-auto shadow-lg print:shadow-none relative overflow-hidden"
      style={{ width: 900, maxWidth: "none", fontFamily: fontBody }}
    >
      {/* Background image overlay */}
      {theme.showBackground && theme.backgroundUrl && (
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none bg-center bg-cover"
          style={{
            backgroundImage: `url("${theme.backgroundUrl}")`,
            opacity: theme.backgroundOpacity,
          }}
        />
      )}

      {/* hex pattern */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none opacity-[0.06]"
        style={{
          backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='56' height='64' viewBox='0 0 56 64'><path d='M28 2 L54 17 L54 47 L28 62 L2 47 L2 17 Z' fill='none' stroke='${encodeURIComponent(theme.primary)}' stroke-width='1'/></svg>")`,
          backgroundSize: "56px 64px",
        }}
      />

      {/* TOP BAR */}
      <div className="relative h-[84px] w-full" style={{ background: theme.accent }}>
        <div
          className="absolute left-0 top-0 flex items-center pl-6 z-10"
          style={{
            width: "38%",
            height: "120px",
            background: theme.primary,
            clipPath: "polygon(0 0, 100% 0, 72% 100%, 0 100%)",
          }}
        >
          {LogoEl}
        </div>

        <div
          className="absolute inset-y-0 right-6 grid grid-cols-2 gap-x-10 gap-y-2 text-[12px] content-center"
          style={{ color: theme.textOnPrimary }}
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

      {/* BADGE */}
      <div className="relative flex justify-center pt-6 pb-4">
        <div
          className="px-8 py-2 rounded-md font-bold tracking-wide"
          style={{ background: theme.accent, color: theme.textOnPrimary, fontFamily: fontHeading }}
        >
          SALES INVOICE
        </div>
      </div>

      {/* META */}
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

      {/* ITEMS */}
      <div className="relative px-8 pb-4">
        <div className="relative border border-slate-300">
          {company?.logo_url && (
            <img
              src={company.logo_url}
              alt=""
              aria-hidden
              crossOrigin="anonymous"
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
              {items.map((it, idx) => (
                <tr key={it.id}>
                  <td className="border border-slate-300 px-2 py-1.5 text-center">{idx + 1}</td>
                  <td className="border border-slate-300 px-2 py-1.5">{it.description}</td>
                  <td className="border border-slate-300 px-2 py-1.5 text-right">{formatBDT(it.unit_price)}</td>
                  <td className="border border-slate-300 px-2 py-1.5 text-center">{it.quantity}</td>
                  <td className="border border-slate-300 px-2 py-1.5 text-right">{formatBDT(it.total)}</td>
                </tr>
              ))}
              {Array.from({ length: Math.max(0, 8 - items.length) }).map((_, i) => (
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
                <td className="border border-slate-300 px-2 py-2 text-right font-extrabold" style={{ borderTop: `2px solid ${theme.accent}` }}>&nbsp;</td>
                <td className="border border-slate-300 px-2 py-2 text-right font-extrabold text-[14px]" style={{ borderTop: `2px solid ${theme.accent}` }}>{formatBDT(inv.total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* IN WORDS */}
      <div className="relative px-8 py-3 text-[13px]">
        <span className="font-bold">In Word:</span> {amountInWords(Number(inv.total))} Taka Only.
      </div>

      {inv.notes && (
        <div className="relative px-8 pb-2 text-[12px] text-slate-700 whitespace-pre-wrap">
          <span className="font-bold">Notes: </span>{inv.notes}
        </div>
      )}

      <div className="relative px-8 pt-8 pb-4 text-center text-[12px] text-slate-700">
        This is a software generated invoice and no signature required.
      </div>

      {/* FOOTER */}
      <div className="relative h-[64px] w-full mt-8" style={{ background: theme.accent }}>
        <div
          className="absolute right-0 flex items-center justify-center text-[12px] leading-snug text-center z-10"
          style={{
            width: "50%",
            height: "96px",
            bottom: 0,
            paddingLeft: "18%",
            paddingRight: "24px",
            background: theme.primary,
            color: theme.textOnPrimary,
            clipPath: "polygon(28% 0, 100% 0, 100% 100%, 0 100%)",
          }}
        >
          {company?.address && <div className="font-semibold break-words whitespace-normal">{company.address}</div>}
        </div>
      </div>
    </div>
  );
}
