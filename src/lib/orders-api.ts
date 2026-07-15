import { isLaravelMode, laravelFetch } from "@/lib/laravel-auth";

function ensure() {
  if (!isLaravelMode()) throw new Error("Laravel mode not enabled");
}

export const ordersApi = {
  list: async (params?: Record<string, string | number>) => {
    ensure();
    const qs = params ? "?" + new URLSearchParams(params as any).toString() : "";
    return laravelFetch(`/customer-orders${qs}`);
  },
  get: async (id: number | string) => {
    ensure();
    return laravelFetch(`/customer-orders/${id}`);
  },
  update: async (id: number | string, payload: Record<string, unknown>) => {
    ensure();
    return laravelFetch(`/customer-orders/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
  },
  remove: async (id: number | string) => {
    ensure();
    return laravelFetch(`/customer-orders/${id}`, { method: "DELETE" });
  },
  placeHosting: async (payload: {
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
    return laravelFetch(`/customer-orders/hosting`, { method: "POST", body: JSON.stringify(payload) });
  },
  activate: async (id: number | string, whm_server_id?: number | null) => {
    ensure();
    return laravelFetch(`/customer-orders/${id}/activate`, {
      method: "POST",
      body: JSON.stringify({ whm_server_id: whm_server_id ?? null }),
    });
  },
  changeDomain: async (id: number | string, domain_name: string) => {
    ensure();
    return laravelFetch(`/customer-orders/${id}/change-domain`, {
      method: "POST",
      body: JSON.stringify({ domain_name }),
    });
  },
};

export const domainPricingApi = {
  list: async () => {
    ensure();
    return laravelFetch(`/domain-pricing`);
  },
  create: async (payload: Record<string, unknown>) => {
    ensure();
    return laravelFetch(`/domain-pricing`, { method: "POST", body: JSON.stringify(payload) });
  },
  update: async (id: number | string, payload: Record<string, unknown>) => {
    ensure();
    return laravelFetch(`/domain-pricing/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
  },
  remove: async (id: number | string) => {
    ensure();
    return laravelFetch(`/domain-pricing/${id}`, { method: "DELETE" });
  },
};
