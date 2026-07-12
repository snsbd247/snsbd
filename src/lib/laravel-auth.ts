/**
 * Laravel API bridge — safe extension.
 *
 * When VITE_API_BASE_URL is set (VPS build), calls go to Laravel.
 * When it's empty (Lovable preview), callers should fall back to Supabase.
 *
 * Usage:
 *   if (isLaravelMode()) { ... use laravelApi() ... }
 *   else { ... existing supabase code ... }
 */

const TOKEN_KEY = 'laravel_auth_token';

export function getApiBaseUrl(): string | null {
  const url = import.meta.env.VITE_API_BASE_URL as string | undefined;
  return url && url.trim() !== '' ? url.replace(/\/$/, '') : null;
}

export function isLaravelMode(): boolean {
  return getApiBaseUrl() !== null;
}

export function getLaravelToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setLaravelToken(token: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearLaravelToken(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(TOKEN_KEY);
}

export interface LaravelApiOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  auth?: boolean; // default true
}

/**
 * Low-level fetch wrapper. Throws on non-2xx with { status, message, errors }.
 */
export async function laravelApi<T = unknown>(
  path: string,
  options: LaravelApiOptions = {},
): Promise<T> {
  const base = getApiBaseUrl();
  if (!base) throw new Error('VITE_API_BASE_URL not set — Laravel mode disabled');

  const { body, auth = true, headers, ...rest } = options;
  const finalHeaders: Record<string, string> = {
    Accept: 'application/json',
    ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    ...(headers as Record<string, string> | undefined),
  };

  if (auth) {
    const token = getLaravelToken();
    if (token) finalHeaders.Authorization = `Bearer ${token}`;
  }

  const url = path.startsWith('http') ? path : `${base}${path.startsWith('/') ? path : `/${path}`}`;

  const res = await fetch(url, {
    ...rest,
    headers: finalHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  const data = text ? safeJson(text) : null;

  if (!res.ok) {
    const err = new Error(
      (data && typeof data === 'object' && 'message' in data && typeof (data as { message: unknown }).message === 'string'
        ? (data as { message: string }).message
        : `HTTP ${res.status}`),
    ) as Error & { status: number; errors?: unknown };
    err.status = res.status;
    if (data && typeof data === 'object' && 'errors' in data) {
      err.errors = (data as { errors: unknown }).errors;
    }
    throw err;
  }

  return data as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/* ---------- Auth helpers ---------- */

export interface LaravelUser {
  id: number;
  name: string;
  username: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
}

export interface LaravelAuthResponse {
  user: LaravelUser;
  roles: string[];
  token: string;
}

export async function laravelLogin(login: string, password: string): Promise<LaravelAuthResponse> {
  const res = await laravelApi<LaravelAuthResponse>('/auth/login', {
    method: 'POST',
    body: { login, password },
    auth: false,
  });
  setLaravelToken(res.token);
  return res;
}

export async function laravelRegister(input: {
  name: string;
  username: string;
  email: string;
  password: string;
}): Promise<LaravelAuthResponse> {
  const res = await laravelApi<LaravelAuthResponse>('/auth/register', {
    method: 'POST',
    body: input,
    auth: false,
  });
  setLaravelToken(res.token);
  return res;
}

export async function laravelMe(): Promise<{ user: LaravelUser; roles: string[] } | null> {
  const token = getLaravelToken();
  if (!token) return null;
  try {
    return await laravelApi<{ user: LaravelUser; roles: string[] }>('/auth/me');
  } catch (err) {
    if ((err as { status?: number }).status === 401) {
      clearLaravelToken();
      return null;
    }
    throw err;
  }
}

export async function laravelLogout(): Promise<void> {
  try {
    await laravelApi('/auth/logout', { method: 'POST' });
  } finally {
    clearLaravelToken();
  }
}
