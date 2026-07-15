import { isLaravelMode, laravelApi } from "@/lib/laravel-auth";

function ensure() {
  if (!isLaravelMode()) throw new Error("Laravel mode not enabled");
}

export interface DashboardStats {
  invoices: { total: number; unpaid: number; overdue: number };
  revenue: { this_month: number; lifetime: number };
  expenses: { this_month: number; lifetime: number };
  salaries: { this_month: number };
  services: { active: number; suspended: number };
  crm: { open_tickets: number; new_leads: number };
}

export interface FinanceReport {
  from: string;
  to: string;
  revenue: Array<{ d: string; total: string | number }>;
  expenses: Array<{ d: string; total: string | number }>;
  totals: { revenue: number; expenses: number; net: number };
}

export const reportsApi = {
  dashboard: () => (ensure(), laravelApi<DashboardStats>("/reports/dashboard")),
  finance: (from?: string, to?: string) => {
    ensure();
    const qs = new URLSearchParams();
    if (from) qs.set("from", from);
    if (to) qs.set("to", to);
    const s = qs.toString();
    return laravelApi<FinanceReport>(`/reports/finance${s ? "?" + s : ""}`);
  },
};
