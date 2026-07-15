import { isLaravelMode, laravelApi } from "@/lib/laravel-auth";

function ensure() {
  if (!isLaravelMode()) throw new Error("Laravel mode not enabled");
}

export const ordersApi = {
  list: <T = unknown>(params?: Record<string, string | number>) => {
    ensure();
    const qs = params ? "?" + new URLSearchParams(params as any).toString() : "";
    return laravelApi<T>(`/customer-orders${qs}`);
  },
  get: <T = unknown>(id: number | string) => {
    ensure();
    return laravelApi<T>(`/customer-orders/${id}`);
  },
  update: <T = unknown>(id: number | string, body: Record<string, unknown>) => {
    ensure();
    return laravelApi<T>(`/customer-orders/${id}`, { method: "PATCH", body });
  },
  remove: (id: number | string) => {
    ensure();
    return laravelApi(`/customer-orders/${id}`, { method: "DELETE" });
  },
  placeHosting: <T = { order_id: number; subtotal: number; discount: number; total: number }>(body: {
    package_id: number;
    domain_name: string;
    billing_cycle?: string;
    payment_method: "manual_bkash" | "bkash_online";
    manual_trx_id?: string;
    manual_sender?: string;
    customer_notes?: string;
    addon_ids?: number[];
    coupon_code?: string;
  }) => {
    ensure();
    return laravelApi<T>(`/customer-orders/hosting`, { method: "POST", body });
  },
  activate: <T = { ok: boolean; service_id: number; cpanel_username: string }>(
    id: number | string,
    whm_server_id?: number | null,
  ) => {
    ensure();
    return laravelApi<T>(`/customer-orders/${id}/activate`, {
      method: "POST",
      body: { whm_server_id: whm_server_id ?? null },
    });
  },
  changeDomain: <T = { ok: boolean; changed: boolean }>(id: number | string, domain_name: string) => {
    ensure();
    return laravelApi<T>(`/customer-orders/${id}/change-domain`, {
      method: "POST",
      body: { domain_name },
    });
  },
};

export const domainPricingApi = {
  list: <T = unknown>() => {
    ensure();
    return laravelApi<T>(`/domain-pricing`);
  },
  create: <T = unknown>(body: Record<string, unknown>) => {
    ensure();
    return laravelApi<T>(`/domain-pricing`, { method: "POST", body });
  },
  update: <T = unknown>(id: number | string, body: Record<string, unknown>) => {
    ensure();
    return laravelApi<T>(`/domain-pricing/${id}`, { method: "PATCH", body });
  },
  remove: (id: number | string) => {
    ensure();
    return laravelApi(`/domain-pricing/${id}`, { method: "DELETE" });
  },
};
