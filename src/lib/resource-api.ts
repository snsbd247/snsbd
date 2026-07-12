/**
 * Generic resource bridge — dual-mode (Laravel or Supabase).
 *
 * Usage:
 *   const leads = resourceApi<Lead>('leads', 'leads');
 *   await leads.list();
 *   await leads.create({...});
 */
import { supabase } from '@/integrations/supabase/client';
import { isLaravelMode, laravelApi } from '@/lib/laravel-auth';

type AnyRow = Record<string, unknown>;

export interface ResourceApi<T extends AnyRow> {
  list: (opts?: { orderBy?: string; ascending?: boolean }) => Promise<T[]>;
  get: (id: string | number) => Promise<T | null>;
  create: (payload: Partial<T>) => Promise<T>;
  update: (id: string | number, patch: Partial<T>) => Promise<T>;
  remove: (id: string | number) => Promise<void>;
}

/**
 * @param laravelPath  Kebab-case Laravel route (e.g. 'leads', 'team-members')
 * @param supabaseTable Supabase table name (snake_case, e.g. 'leads')
 */
export function resourceApi<T extends AnyRow>(
  laravelPath: string,
  supabaseTable: string,
): ResourceApi<T> {
  return {
    async list(opts) {
      if (isLaravelMode()) {
        const res = await laravelApi<T[] | { data: T[] }>(`/${laravelPath}`, { auth: true });
        if (Array.isArray(res)) return res;
        return (res?.data as T[]) ?? [];
      }
      const orderBy = opts?.orderBy ?? 'created_at';
      const { data, error } = await supabase
        .from(supabaseTable as never)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .select('*' as any)
        .order(orderBy, { ascending: opts?.ascending ?? false });
      if (error) throw error;
      return (data as unknown as T[]) ?? [];
    },
    async get(id) {
      if (isLaravelMode()) {
        return await laravelApi<T>(`/${laravelPath}/${id}`, { auth: true });
      }
      const { data, error } = await supabase
        .from(supabaseTable as never)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .select('*' as any)
        .eq('id', id as never)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as T) ?? null;
    },
    async create(payload) {
      if (isLaravelMode()) {
        return (await laravelApi<T>(`/${laravelPath}`, { method: 'POST', body: payload })) as T;
      }
      const { data, error } = await supabase
        .from(supabaseTable as never)
        .insert(payload as never)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as T;
    },
    async update(id, patch) {
      if (isLaravelMode()) {
        return (await laravelApi<T>(`/${laravelPath}/${id}`, { method: 'PUT', body: patch })) as T;
      }
      const { data, error } = await supabase
        .from(supabaseTable as never)
        .update(patch as never)
        .eq('id', id as never)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as T;
    },
    async remove(id) {
      if (isLaravelMode()) {
        await laravelApi(`/${laravelPath}/${id}`, { method: 'DELETE' });
        return;
      }
      const { error } = await supabase
        .from(supabaseTable as never)
        .delete()
        .eq('id', id as never);
      if (error) throw error;
    },
  };
}

/* ---------------- Preconfigured resources ---------------- */
export const whmServersApi = resourceApi('whm-servers', 'whm_servers');
export const serviceCatalogApi = resourceApi('service-catalog', 'service_catalog');
export const teamMembersApi = resourceApi('team-members', 'team_members');
export const leadsApi = resourceApi('leads', 'leads');
export const salaryPaymentsApi = resourceApi('salary-payments', 'salary_payments');
export const expensesApi = resourceApi('expenses', 'expenses');
export const projectsApi = resourceApi('projects', 'projects');
export const projectMilestonesApi = resourceApi('project-milestones', 'project_milestones');
export const projectActivityLogsApi = resourceApi('project-activity-logs', 'project_activity_log');
export const servicesApi = resourceApi('services', 'services');
export const servicePackageChangesApi = resourceApi('service-package-changes', 'service_package_changes');
export const customerOrdersApi = resourceApi('customer-orders', 'customer_orders');
export const invoicesApi = resourceApi('invoices', 'invoices');
export const invoiceItemsApi = resourceApi('invoice-items', 'invoice_items');
export const paymentsApi = resourceApi('payments', 'payments');
export const paymentGatewaysApi = resourceApi('payment-gateways', 'payment_gateways');
export const paymentTransactionsApi = resourceApi('payment-transactions', 'payment_transactions');
