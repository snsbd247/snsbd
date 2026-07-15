/**
 * Auth bridge — routes calls to Laravel or Supabase based on VITE_API_BASE_URL.
 *
 * Safe extension: existing Supabase code keeps working unchanged.
 * New/refactored code should call this bridge instead of supabase.auth directly.
 */
import { supabase } from '@/integrations/supabase/client';
import {
  isLaravelMode,
  laravelLogin,
  laravelLogout,
  laravelMe,
  laravelRegister,
  clearLaravelToken,
  type LaravelUser,
} from '@/lib/laravel-auth';

export interface BridgeUser {
  id: string | number;
  email: string;
  username?: string;
  name?: string;
  roles: string[];
}

function fromLaravel(u: LaravelUser, roles: string[]): BridgeUser {
  return {
    id: u.id,
    email: u.email,
    username: u.username ?? undefined,
    name: u.name ?? undefined,
    roles,
  };
}

export async function bridgeLogin(login: string, password: string): Promise<BridgeUser> {
  if (isLaravelMode()) {
    const res = await laravelLogin(login, password);
    return fromLaravel(res.user, res.roles);
  }

  // Supabase: login field may be email or username
  const isEmail = login.includes('@');
  let email = login;

  if (!isEmail) {
    const { data, error } = await supabase.rpc('email_for_username', { _username: login });
    if (error || !data) throw new Error('Invalid credentials.');
    email = data as string;
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) throw new Error(error?.message ?? 'Invalid credentials.');

  return {
    id: data.user.id,
    email: data.user.email ?? email,
    roles: [],
  };
}

export async function bridgeRegister(input: {
  name: string;
  username: string;
  email: string;
  password: string;
}): Promise<BridgeUser> {
  if (isLaravelMode()) {
    const res = await laravelRegister(input);
    return fromLaravel(res.user, res.roles);
  }

  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      emailRedirectTo: window.location.origin,
      data: { full_name: input.name, username: input.username },
    },
  });
  if (error || !data.user) throw new Error(error?.message ?? 'Signup failed.');

  return { id: data.user.id, email: input.email, name: input.name, username: input.username, roles: [] };
}

export async function bridgeMe(): Promise<BridgeUser | null> {
  if (isLaravelMode()) {
    const res = await laravelMe();
    if (!res) return null;
    return fromLaravel(res.user, res.roles);
  }

  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  return { id: data.user.id, email: data.user.email ?? '', roles: [] };
}

export async function bridgeLogout(): Promise<void> {
  if (isLaravelMode()) {
    await laravelLogout();
    clearLaravelToken();
    return;
  }
  await supabase.auth.signOut();
}
