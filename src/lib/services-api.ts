/**
 * Frontend services API wrappers — Laravel-mode aware.
 * In Supabase preview mode, callers should keep using the existing
 * `hosting-packages-api.ts` / `resource-api.ts` shims which already
 * branch on `isLaravelMode()`.
 */
import { isLaravelMode, laravelApi } from "@/lib/laravel-auth";

function ensureLaravel(): void {
  if (!isLaravelMode()) {
    throw new Error("Laravel mode is not enabled. Use the Supabase path instead.");
  }
}

function toQuery(params: Record<string, string | number | undefined | null>): string {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)]),
  ).toString();
  return qs ? `?${qs}` : "";
}

export const servicesApi = {
  list(params: { status?: string; per_page?: number } = {}) {
    ensureLaravel();
    return laravelApi<{ data: unknown[]; total: number }>(`/services${toQuery(params)}`);
  },
  get(id: number | string) {
    ensureLaravel();
    return laravelApi<unknown>(`/services/${id}`);
  },
  create(input: Record<string, unknown>) {
    ensureLaravel();
    return laravelApi<unknown>("/services", { method: "POST", body: input });
  },
  update(id: number | string, patch: Record<string, unknown>) {
    ensureLaravel();
    return laravelApi<unknown>(`/services/${id}`, { method: "PUT", body: patch });
  },
  remove(id: number | string) {
    ensureLaravel();
    return laravelApi<{ ok: boolean }>(`/services/${id}`, { method: "DELETE" });
  },
  changePackage(id: number | string, newPackageId: number) {
    ensureLaravel();
    return laravelApi<unknown>(`/services/${id}/change-package`, {
      method: "POST",
      body: { new_package_id: newPackageId },
    });
  },
};

export const catalogApi = {
  hostingPackages() {
    ensureLaravel();
    return laravelApi<unknown[]>("/hosting-packages", { auth: false });
  },
  serviceCatalog() {
    ensureLaravel();
    return laravelApi<unknown[]>("/service-catalog", { auth: false });
  },
  productAddons() {
    ensureLaravel();
    return laravelApi<unknown[]>("/product-addons", { auth: false });
  },
  createHostingPackage(input: Record<string, unknown>) {
    ensureLaravel();
    return laravelApi<unknown>("/hosting-packages", { method: "POST", body: input });
  },
  updateHostingPackage(id: number | string, patch: Record<string, unknown>) {
    ensureLaravel();
    return laravelApi<unknown>(`/hosting-packages/${id}`, { method: "PUT", body: patch });
  },
  removeHostingPackage(id: number | string) {
    ensureLaravel();
    return laravelApi<{ ok: boolean }>(`/hosting-packages/${id}`, { method: "DELETE" });
  },
};
