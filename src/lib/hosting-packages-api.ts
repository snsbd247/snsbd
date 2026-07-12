/**
 * Hosting Packages API — dual-mode (Laravel or Supabase).
 */
import { supabase } from '@/integrations/supabase/client';
import { isLaravelMode, laravelApi } from '@/lib/laravel-auth';

export interface HostingPackage {
  id: number | string;
  name: string;
  slug?: string | null;
  description?: string | null;
  price_monthly?: number | string | null;
  price_yearly?: number | string | null;
  disk_space?: string | null;
  bandwidth?: string | null;
  email_accounts?: number | null;
  databases?: number | null;
  domains?: number | null;
  subdomains?: number | null;
  features?: unknown;
  is_active?: boolean;
  sort_order?: number | null;
  [k: string]: unknown;
}

export async function listHostingPackages(): Promise<HostingPackage[]> {
  if (isLaravelMode()) {
    return (await laravelApi<HostingPackage[]>('/hosting-packages', { auth: false })) ?? [];
  }
  const { data, error } = await supabase
    .from('hosting_packages')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data as HostingPackage[]) ?? [];
}

export async function getHostingPackage(id: number | string): Promise<HostingPackage | null> {
  if (isLaravelMode()) {
    return await laravelApi<HostingPackage>(`/hosting-packages/${id}`, { auth: false });
  }
  const { data, error } = await supabase.from('hosting_packages').select('*').eq('id', id as never).maybeSingle();
  if (error) throw error;
  return data as HostingPackage | null;
}

export async function createHostingPackage(payload: Partial<HostingPackage>): Promise<HostingPackage> {
  if (isLaravelMode()) {
    return await laravelApi<HostingPackage>('/hosting-packages', { method: 'POST', body: payload });
  }
  const { data, error } = await supabase.from('hosting_packages').insert(payload as never).select().single();
  if (error) throw error;
  return data as HostingPackage;
}

export async function updateHostingPackage(
  id: number | string,
  patch: Partial<HostingPackage>,
): Promise<HostingPackage> {
  if (isLaravelMode()) {
    return await laravelApi<HostingPackage>(`/hosting-packages/${id}`, { method: 'PUT', body: patch });
  }
  const { data, error } = await supabase
    .from('hosting_packages')
    .update(patch as never)
    .eq('id', id as never)
    .select()
    .single();
  if (error) throw error;
  return data as HostingPackage;
}

export async function deleteHostingPackage(id: number | string): Promise<void> {
  if (isLaravelMode()) {
    await laravelApi(`/hosting-packages/${id}`, { method: 'DELETE' });
    return;
  }
  const { error } = await supabase.from('hosting_packages').delete().eq('id', id as never);
  if (error) throw error;
}
