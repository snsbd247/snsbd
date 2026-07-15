/**
 * Laravel/MySQL bridge — Step 2 (auth only).
 *
 * Safety contract:
 *   - When `VITE_API_BASE_URL` is set → Laravel API is used.
 *   - When it is NOT set (e.g. Lovable preview) → this module is inert.
 *     Existing Supabase calls elsewhere in the app keep working unchanged.
 *
 * No existing code has been rewired yet; this file is opt-in.
 */

const TOKEN_KEY = "laravel_auth_token";

export function getApiBaseUrl(): string | null {
  const raw = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
  return raw && raw.length > 0 ? raw.replace(/\/+$/, "") : null;
}

export function isLaravelBackendEnabled(): boolean {
  return getApiBaseUrl() !== null;
}

export function getLaravelToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setLaravelToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

export type LaravelUser = {
  id: number;
  email: string;
  profile?: {
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
  roles?: Array<{ role: string }>;
};

export type LaravelAuthResponse = {
  user: LaravelUser;
  token: string;
};

async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const base = getApiBaseUrl();
  if (!base) throw new Error("Laravel API base URL is not configured.");

  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }
  const token = getLaravelToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${base}${path}`, { ...init, headers });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const message =
      (data && (data.message || data.error)) || `HTTP ${res.status}`;
    throw new Error(message);
  }
  return data as T;
}

export const laravelAuth = {
  async login(identifier: string, password: string): Promise<LaravelAuthResponse> {
    const res = await apiFetch<LaravelAuthResponse>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ identifier, password }),
    });
    setLaravelToken(res.token);
    return res;
  },

  async register(input: {
    email: string;
    password: string;
    full_name?: string;
    username?: string;
  }): Promise<LaravelAuthResponse> {
    const res = await apiFetch<LaravelAuthResponse>("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify(input),
    });
    setLaravelToken(res.token);
    return res;
  },

  async me(): Promise<{ user: LaravelUser } | null> {
    if (!getLaravelToken()) return null;
    try {
      return await apiFetch<{ user: LaravelUser }>("/api/v1/auth/me");
    } catch {
      setLaravelToken(null);
      return null;
    }
  },

  async logout(): Promise<void> {
    try {
      await apiFetch("/api/v1/auth/logout", { method: "POST" });
    } finally {
      setLaravelToken(null);
    }
  },
};
