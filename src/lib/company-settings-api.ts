/**
 * Company Settings API — dual-mode (Laravel or Supabase).
 */
import { supabase } from '@/integrations/supabase/client';
import { isLaravelMode, laravelApi } from '@/lib/laravel-auth';

export interface CompanySettings {
  id: number | boolean;
  company_name: string;
  logo_url: string | null;
  favicon_url: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  website: string | null;
  facebook_url: string | null;
  footer_copyright: string | null;
  late_fee_percent: number | string;
}

export async function getCompanySettings(): Promise<CompanySettings | null> {
  if (isLaravelMode()) {
    return await laravelApi<CompanySettings>('/company-settings', { auth: false });
  }
  const { data, error } = await supabase.from('company_settings').select('*').maybeSingle();
  if (error) throw error;
  return data as CompanySettings | null;
}

export async function updateCompanySettings(
  patch: Partial<Omit<CompanySettings, 'id'>>,
): Promise<CompanySettings> {
  if (isLaravelMode()) {
    return await laravelApi<CompanySettings>('/company-settings', {
      method: 'PUT',
      body: patch,
    });
  }
  const { data, error } = await supabase
    .from('company_settings')
    .update(patch as never)
    .eq('id', true)
    .select()
    .single();
  if (error) throw error;
  return data as CompanySettings;
}


/** Upload logo/favicon file — Laravel only (Supabase mode uses direct URL input). */
export async function uploadCompanyLogo(
  file: File,
  field: 'logo_url' | 'favicon_url' = 'logo_url',
): Promise<{ url: string; settings: CompanySettings }> {
  if (!isLaravelMode()) {
    throw new Error('File upload requires Laravel backend. In Supabase mode, paste a URL directly.');
  }
  const base = import.meta.env.VITE_API_BASE_URL as string;
  const token = window.localStorage.getItem('laravel_auth_token');
  const form = new FormData();
  form.append('file', file);
  form.append('field', field);

  const res = await fetch(`${base.replace(/\/$/, '')}/company-settings/logo`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: form,
  });
  if (!res.ok) throw new Error(`Upload failed: HTTP ${res.status}`);
  return await res.json();
}
