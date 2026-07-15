/**
 * Laravel/MySQL bridge.
 *
 * Safety contract:
 *   - When `VITE_API_BASE_URL` is set → Laravel API is used.
 *   - When it is NOT set (Lovable preview) → this module is inert.
 *     Existing Supabase calls elsewhere in the app keep working unchanged.
 */

const TOKEN_KEY = "laravel_auth_token";

// ---------- Base config ----------

export function getApiBaseUrl(): string | null {
  const raw = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
  return raw && raw.length > 0 ? raw.replace(/\/+$/, "") : null;
}

export function isLaravelMode(): boolean {
  return getApiBaseUrl() !== null;
}

// Legacy alias used elsewhere in the codebase.
export const isLaravelBackendEnabled = isLaravelMode;

// ---------- Token storage ----------

export function getLaravelToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setLaravelToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

export function clearLaravelToken(): void {
  setLaravelToken(null);
}

// ---------- Types ----------

export interface LaravelUser {
  id: number;
  email: string;
  username: string | null;
  name: string | null;
}

export interface LaravelAuthResult {
  user: LaravelUser;
  roles: string[];
}

interface RawUserResponse {
  id: number;
  email: string;
  profile?: {
    full_name?: string | null;
    username?: string | null;
    avatar_url?: string | null;
  } | null;
  roles?: Array<{ role: string }>;
}

function normalizeUser(u: RawUserResponse): LaravelAuthResult {
  return {
    user: {
      id: u.id,
      email: u.email,
      username: u.profile?.username ?? null,
      name: u.profile?.full_name ?? null,
    },
    roles: (u.roles ?? []).map((r) => r.role),
  };
}

// ---------- Generic API helper ----------

export interface LaravelApiOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  auth?: boolean;
  headers?: Record<string, string>;
}

export async function laravelApi<T>(
  path: string,
  opts: LaravelApiOptions = {},
): Promise<T> {
  const base = getApiBaseUrl();
  if (!base) throw new Error("Laravel API base URL is not configured.");

  const method = opts.method ?? "GET";
  const headers = new Headers(opts.headers);
  headers.set("Accept", "application/json");

  let body: BodyInit | undefined;
  if (opts.body !== undefined && method !== "GET") {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(opts.body);
  }

  // auth defaults: true unless explicitly disabled
  const useAuth = opts.auth !== false;
  if (useAuth) {
    const token = getLaravelToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  // path may be either "/api/v1/foo" or "/foo" — normalize to "/api/v1/..."
  const normalized = path.startsWith("/api/")
    ? path
    : `/api/v1${path.startsWith("/") ? path : `/${path}`}`;

  const res = await fetch(`${base}${normalized}`, { method, headers, body });
  const text = await res.text();
  const data = text ? safeJson(text) : null;

  if (!res.ok) {
    const message =
      (data && (data.message || data.error)) || `HTTP ${res.status}`;
    throw new Error(typeof message === "string" ? message : JSON.stringify(message));
  }
  return data as T;
}

function safeJson(text: string): { message?: string; error?: string } & Record<string, unknown> {
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

// ---------- Auth endpoints ----------

export async function laravelLogin(
  login: string,
  password: string,
): Promise<LaravelAuthResult> {
  const res = await laravelApi<{ user: RawUserResponse; token: string }>(
    "/auth/login",
    { method: "POST", body: { identifier: login, password }, auth: false },
  );
  setLaravelToken(res.token);
  return normalizeUser(res.user);
}

export async function laravelRegister(input: {
  name: string;
  username: string;
  email: string;
  password: string;
}): Promise<LaravelAuthResult> {
  const res = await laravelApi<{ user: RawUserResponse; token: string }>(
    "/auth/register",
    {
      method: "POST",
      body: {
        email: input.email,
        password: input.password,
        full_name: input.name,
        username: input.username,
      },
      auth: false,
    },
  );
  setLaravelToken(res.token);
  return normalizeUser(res.user);
}

export async function laravelMe(): Promise<LaravelAuthResult | null> {
  if (!getLaravelToken()) return null;
  try {
    const res = await laravelApi<{ user: RawUserResponse }>("/auth/me");
    return normalizeUser(res.user);
  } catch {
    clearLaravelToken();
    return null;
  }
}

export async function laravelLogout(): Promise<void> {
  try {
    await laravelApi("/auth/logout", { method: "POST" });
  } finally {
    clearLaravelToken();
  }
}
