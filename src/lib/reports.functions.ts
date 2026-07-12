import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: any) {
  const { data: ok } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!ok) throw new Error("Admins only");
}

function monthKey(d: string | Date) {
  const dt = new Date(d);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}`;
}

export const getReportsOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const supabase = context.supabase;

    const since = new Date();
    since.setUTCMonth(since.getUTCMonth() - 11);
    since.setUTCDate(1);
    const sinceISO = since.toISOString().slice(0, 10);

    // Revenue (payments)
    const { data: payments } = await supabase
      .from("payments")
      .select("amount, paid_at")
      .gte("paid_at", sinceISO)
      .order("paid_at", { ascending: true });

    // Expenses
    const { data: expenses } = await supabase
      .from("expenses")
      .select("amount, expense_date")
      .gte("expense_date", sinceISO)
      .order("expense_date", { ascending: true });

    // Services (active + MRR)
    const { data: services } = await supabase
      .from("services")
      .select("id, type, status, sale_price, expiry_date, renewable");

    // Invoices status counts
    const { data: invoices } = await supabase
      .from("invoices")
      .select("id, status, total, amount_paid");

    // Build 12-month buckets
    const months: string[] = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(since);
      d.setUTCMonth(since.getUTCMonth() + i);
      months.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
    }
    const revByMonth: Record<string, number> = Object.fromEntries(months.map((m) => [m, 0]));
    const expByMonth: Record<string, number> = Object.fromEntries(months.map((m) => [m, 0]));
    for (const p of payments ?? []) {
      if (!p.paid_at) continue;
      const k = monthKey(p.paid_at);
      if (k in revByMonth) revByMonth[k] += Number(p.amount) || 0;
    }
    for (const e of expenses ?? []) {
      if (!e.expense_date) continue;
      const k = monthKey(e.expense_date);
      if (k in expByMonth) expByMonth[k] += Number(e.amount) || 0;
    }
    const monthly = months.map((m) => ({
      month: m,
      revenue: Math.round(revByMonth[m] * 100) / 100,
      expenses: Math.round(expByMonth[m] * 100) / 100,
      profit: Math.round((revByMonth[m] - expByMonth[m]) * 100) / 100,
    }));

    const totalRevenue = Object.values(revByMonth).reduce((a, b) => a + b, 0);
    const totalExpenses = Object.values(expByMonth).reduce((a, b) => a + b, 0);

    const activeServices = (services ?? []).filter((s: any) => s.status === "active");
    const mrr = activeServices
      .filter((s: any) => s.renewable)
      .reduce((sum: number, s: any) => sum + (Number(s.sale_price) || 0) / 12, 0);

    // Service breakdown by type
    const typeMap: Record<string, number> = {};
    for (const s of activeServices) {
      typeMap[s.type ?? "other"] = (typeMap[s.type ?? "other"] ?? 0) + 1;
    }
    const serviceMix = Object.entries(typeMap).map(([type, count]) => ({ type, count }));

    // Upcoming expiries (next 60 days)
    const horizon = new Date();
    horizon.setUTCDate(horizon.getUTCDate() + 60);
    const upcoming = (services ?? [])
      .filter((s: any) => s.expiry_date && s.status === "active" && new Date(s.expiry_date) <= horizon)
      .length;

    // Invoice status
    const invByStatus: Record<string, { count: number; outstanding: number }> = {};
    for (const i of invoices ?? []) {
      const st = i.status ?? "unknown";
      invByStatus[st] ??= { count: 0, outstanding: 0 };
      invByStatus[st].count++;
      invByStatus[st].outstanding += Math.max(0, Number(i.total) - Number(i.amount_paid));
    }
    const invoiceStatus = Object.entries(invByStatus).map(([status, v]) => ({ status, ...v }));

    return {
      totals: {
        revenue: Math.round(totalRevenue * 100) / 100,
        expenses: Math.round(totalExpenses * 100) / 100,
        profit: Math.round((totalRevenue - totalExpenses) * 100) / 100,
        mrr: Math.round(mrr * 100) / 100,
        active_services: activeServices.length,
        upcoming_renewals: upcoming,
      },
      monthly,
      service_mix: serviceMix,
      invoice_status: invoiceStatus,
    };
  });
