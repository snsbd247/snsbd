import { isLaravelMode, laravelApi } from "@/lib/laravel-auth";

function ensure() {
  if (!isLaravelMode()) throw new Error("Laravel mode not enabled");
}

export const projectsApi = {
  list: <T = unknown>() => (ensure(), laravelApi<T>(`/projects`)),
  get: <T = unknown>(id: number | string) => (ensure(), laravelApi<T>(`/projects/${id}`)),
  create: <T = unknown>(body: Record<string, unknown>) =>
    (ensure(), laravelApi<T>(`/projects`, { method: "POST", body })),
  update: <T = unknown>(id: number | string, body: Record<string, unknown>) =>
    (ensure(), laravelApi<T>(`/projects/${id}`, { method: "PATCH", body })),
  remove: (id: number | string) =>
    (ensure(), laravelApi(`/projects/${id}`, { method: "DELETE" })),
};

export const projectMilestonesApi = {
  list: <T = unknown>(project_id?: number | string) => {
    ensure();
    const qs = project_id ? `?project_id=${project_id}` : "";
    return laravelApi<T>(`/project-milestones${qs}`);
  },
  create: <T = unknown>(body: Record<string, unknown>) =>
    (ensure(), laravelApi<T>(`/project-milestones`, { method: "POST", body })),
  update: <T = unknown>(id: number | string, body: Record<string, unknown>) =>
    (ensure(), laravelApi<T>(`/project-milestones/${id}`, { method: "PATCH", body })),
  remove: (id: number | string) =>
    (ensure(), laravelApi(`/project-milestones/${id}`, { method: "DELETE" })),
};

export const projectActivityApi = {
  list: <T = unknown>(project_id?: number | string, limit = 100) => {
    ensure();
    const params = new URLSearchParams();
    if (project_id) params.set("project_id", String(project_id));
    params.set("limit", String(limit));
    return laravelApi<T>(`/project-activity-logs?${params.toString()}`);
  },
  create: <T = unknown>(body: Record<string, unknown>) =>
    (ensure(), laravelApi<T>(`/project-activity-logs`, { method: "POST", body })),
};
