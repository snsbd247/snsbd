/**
 * Domain Pricing API — dual-mode (Laravel or Supabase).
 */
import { supabase } from '@/integrations/supabase/client';
import { isLaravelMode, laravelApi } from '@/lib/laravel-auth';

export interface DomainPricing {
  id: number | string;
  extension: string;
  register_price?: number | string | null;
  renew_price?: number | string | null;
  transfer_price?: number | string | null;
  currency?: string | null;
  is_active?: boolean;
  is_popular?: boolean;
  sort_order?: number | null;
  [k: string]: unknown;
}

export async function listDomainPricing(): Promise<DomainPricing[]> {
  if (isLaravelMode()) {
    return (await laravelApi<DomainPricing[]>('/domain-pricing', { auth: false })) ?? [];
  }
  const { data, error } = await supabase
    .from('domain_pricing')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data as DomainPricing[]) ?? [];
}

export async function createDomainPricing(payload: Partial<DomainPricing>): Promise<DomainPricing> {
  if (isLaravelMode()) {
    return await laravelApi<DomainPricing>('/domain-pricing', { method: 'POST', body: payload });
  }
  const { data, error } = await supabase.from('domain_pricing').insert(payload as never).select().single();
  if (error) throw error;
  return data as DomainPricing;
}

export async function updateDomainPricing(
  id: number | string,
  patch: Partial<DomainPricing>,
): Promise<DomainPricing> {
  if (isLaravelMode()) {
    return await laravelApi<DomainPricing>(`/domain-pricing/${id}`, { method: 'PUT', body: patch });
  }
  const { data, error } = await supabase
    .from('domain_pricing')
    .update(patch as never)
    .eq('id', id as never)
    .select()
    .single();
  if (error) throw error;
  return data as DomainPricing;
}

export async function deleteDomainPricing(id: number | string): Promise<void> {
  if (isLaravelMode()) {
    await laravelApi(`/domain-pricing/${id}`, { method: 'DELETE' });
    return;
  }
  const { error } = await supabase.from('domain_pricing').delete().eq('id', id as never);
  if (error) throw error;
}
