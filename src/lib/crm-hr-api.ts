import { isLaravelMode, laravelApi } from "@/lib/laravel-auth";

function ensure() {
  if (!isLaravelMode()) throw new Error("Laravel mode not enabled");
}

function crud<TList = unknown, TOne = unknown>(base: string) {
  return {
    list: (params?: Record<string, string | number>) => {
      ensure();
      const qs = params ? "?" + new URLSearchParams(params as any).toString() : "";
      return laravelApi<TList>(`${base}${qs}`);
    },
    get: (id: number | string) => (ensure(), laravelApi<TOne>(`${base}/${id}`)),
    create: (body: Record<string, unknown>) =>
      (ensure(), laravelApi<TOne>(base, { method: "POST", body })),
    update: (id: number | string, body: Record<string, unknown>) =>
      (ensure(), laravelApi<TOne>(`${base}/${id}`, { method: "PATCH", body })),
    remove: (id: number | string) =>
      (ensure(), laravelApi(`${base}/${id}`, { method: "DELETE" })),
  };
}

// ---------- CRM ----------
export const leadsApi = {
  ...crud("/leads"),
  capture: (body: Record<string, unknown>) =>
    (ensure(), laravelApi(`/leads/capture`, { method: "POST", body })),
};

export const ticketsApi = {
  list: (status?: string) => {
    ensure();
    const qs = status ? `?status=${encodeURIComponent(status)}` : "";
    return laravelApi(`/tickets${qs}`);
  },
  get: (id: number | string) => (ensure(), laravelApi(`/tickets/${id}`)),
  create: (body: { subject: string; body: string; department?: string; priority?: string }) =>
    (ensure(), laravelApi(`/tickets`, { method: "POST", body })),
  reply: (id: number | string, body: string) =>
    (ensure(), laravelApi(`/tickets/${id}/reply`, { method: "POST", body: { body } })),
  close: (id: number | string) =>
    (ensure(), laravelApi(`/tickets/${id}/close`, { method: "POST" })),
};

export const kbApi = {
  ...crud("/kb-articles"),
  published: (category?: string) => {
    ensure();
    const qs = category ? `?category=${encodeURIComponent(category)}` : "";
    return laravelApi(`/kb${qs}`);
  },
  bySlug: (slug: string) => (ensure(), laravelApi(`/kb/${slug}`)),
};

// ---------- HR ----------
export const teamApi = crud("/team-members");
export const salaryApi = {
  ...crud("/salary-payments"),
  byMember: (team_member_id: number | string) =>
    (ensure(), laravelApi(`/salary-payments?team_member_id=${team_member_id}`)),
};
export const expensesApi = crud("/expenses");
