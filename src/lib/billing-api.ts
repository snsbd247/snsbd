/**
 * Frontend billing API wrappers — Laravel-mode aware.
 *
 * When `VITE_API_BASE_URL` is set (VPS), calls hit Laravel.
 * When unset (Lovable preview), consumers should keep using Supabase
 * paths (`supabase.from('invoices')...`). These wrappers throw if used
 * in Supabase mode so callers must gate on `isLaravelMode()`.
 */
import { isLaravelMode, laravelApi } from "@/lib/laravel-auth";

export interface InvoiceItemInput {
  service_id?: number | null;
  description: string;
  quantity: number;
  unit_price: number;
}

export interface InvoiceInput {
  customer_id: number;
  issue_date: string; // YYYY-MM-DD
  due_date?: string | null;
  currency_code?: string;
  template_key?: string | null;
  notes?: string | null;
  terms?: string | null;
  coupon_id?: number | null;
  tax?: number;
  discount?: number;
  items: InvoiceItemInput[];
}

function ensureLaravel(): void {
  if (!isLaravelMode()) {
    throw new Error("Laravel mode is not enabled. Use the Supabase path instead.");
  }
}

export const invoicesApi = {
  list(params: { status?: string; per_page?: number } = {}) {
    ensureLaravel();
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)]),
    ).toString();
    return laravelApi<{ data: unknown[]; total: number }>(
      `/invoices${qs ? `?${qs}` : ""}`,
    );
  },
  get(id: number | string) {
    ensureLaravel();
    return laravelApi<unknown>(`/invoices/${id}`);
  },
  create(input: InvoiceInput) {
    ensureLaravel();
    return laravelApi<unknown>("/invoices", { method: "POST", body: input });
  },
  update(id: number | string, patch: Record<string, unknown>) {
    ensureLaravel();
    return laravelApi<unknown>(`/invoices/${id}`, { method: "PUT", body: patch });
  },
  remove(id: number | string) {
    ensureLaravel();
    return laravelApi<{ ok: boolean }>(`/invoices/${id}`, { method: "DELETE" });
  },
};

export const paymentsApi = {
  list(params: { per_page?: number } = {}) {
    ensureLaravel();
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)]),
    ).toString();
    return laravelApi<{ data: unknown[]; total: number }>(
      `/payments${qs ? `?${qs}` : ""}`,
    );
  },
  create(input: {
    invoice_id: number;
    amount: number;
    gateway_id?: number | null;
    reference?: string | null;
    currency_code?: string;
    notes?: string | null;
  }) {
    ensureLaravel();
    return laravelApi<unknown>("/payments", { method: "POST", body: input });
  },
  markPaid(id: number | string) {
    ensureLaravel();
    return laravelApi<unknown>(`/payments/${id}/mark-paid`, { method: "POST" });
  },
};

export const billingCatalogApi = {
  currencies() {
    ensureLaravel();
    return laravelApi<Array<{ code: string; name: string; symbol: string; rate_to_bdt: number; is_active: boolean }>>(
      "/currencies",
      { auth: false },
    );
  },
  invoiceTemplates() {
    ensureLaravel();
    return laravelApi<Array<{ template_key: string; name: string; theme: Record<string, unknown>; is_default: boolean }>>(
      "/invoice-templates",
      { auth: false },
    );
  },
  paymentGateways() {
    ensureLaravel();
    return laravelApi<Array<{ id: number; code: string; name: string; provider: string; is_test_mode: boolean }>>(
      "/payment-gateways",
      { auth: false },
    );
  },
  coupons() {
    ensureLaravel();
    return laravelApi<{ data: unknown[]; total: number }>("/coupons");
  },
};
