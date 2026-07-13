import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PageContent = Record<string, string>;

export interface PageRecord {
  slug: string;
  title?: string | null;
  content: PageContent;
  seo_title?: string | null;
  seo_description?: string | null;
  og_image?: string | null;
  hero_image?: string | null;
}

export interface PageVersion extends PageRecord {
  id: string;
  created_at: string;
  created_by?: string | null;
}

const cache = new Map<string, PageRecord>();
const listeners = new Map<string, Set<(v: PageRecord) => void>>();

const PREVIEW_PARAM = "preview";
const PREVIEW_STORAGE = (slug: string) => `page-preview:${slug}`;
const CHANNEL_NAME = "page-content-preview";

function getChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === "undefined") return null;
  return new BroadcastChannel(CHANNEL_NAME);
}

function isPreviewMode(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get(PREVIEW_PARAM) === "1";
}

async function fetchPageRecord(slug: string): Promise<PageRecord> {
  const { data } = await supabase
    .from("page_contents")
    .select("slug, title, content, seo_title, seo_description, og_image, hero_image")
    .eq("slug", slug)
    .maybeSingle();
  if (!data) return { slug, content: {} };
  return { ...data, content: (data.content as PageContent) ?? {} };
}

export function usePageRecord(slug: string, defaults: PageContent = {}): PageRecord {
  const [rec, setRec] = useState<PageRecord>(() => ({
    slug,
    content: { ...defaults, ...(cache.get(slug)?.content ?? {}) },
    ...cache.get(slug),
  }));

  useEffect(() => {
    let alive = true;
    const apply = (v: PageRecord) =>
      alive && setRec({ ...v, content: { ...defaults, ...(v.content ?? {}) } });

    if (cache.has(slug)) apply(cache.get(slug)!);
    fetchPageRecord(slug).then((v) => {
      cache.set(slug, v);
      apply(v);
    });

    // Preview mode: listen for draft updates from admin editor
    let channel: BroadcastChannel | null = null;
    let onStorage: ((e: StorageEvent) => void) | null = null;
    if (isPreviewMode()) {
      const draftRaw = localStorage.getItem(PREVIEW_STORAGE(slug));
      if (draftRaw) {
        try { apply({ ...(JSON.parse(draftRaw) as PageRecord), slug }); } catch { /* ignore */ }
      }
      channel = getChannel();
      channel?.addEventListener("message", (ev) => {
        if (ev.data?.slug === slug) apply({ ...(ev.data.record as PageRecord), slug });
      });
      onStorage = (e) => {
        if (e.key === PREVIEW_STORAGE(slug) && e.newValue) {
          try { apply({ ...(JSON.parse(e.newValue) as PageRecord), slug }); } catch { /* ignore */ }
        }
      };
      window.addEventListener("storage", onStorage);
    }

    let set = listeners.get(slug);
    if (!set) { set = new Set(); listeners.set(slug, set); }
    set.add(apply);

    return () => {
      alive = false;
      listeners.get(slug)?.delete(apply);
      channel?.close();
      if (onStorage) window.removeEventListener("storage", onStorage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  return rec;
}

// Backwards-compat: just returns the content map
export function usePageContent(slug: string, defaults: PageContent = {}): PageContent {
  return usePageRecord(slug, defaults).content;
}

export function invalidatePageContent(slug: string) {
  cache.delete(slug);
  fetchPageRecord(slug).then((v) => {
    cache.set(slug, v);
    listeners.get(slug)?.forEach((cb) => cb(v));
  });
}

export function broadcastPreview(slug: string, record: PageRecord) {
  if (typeof window === "undefined") return;
  const payload = JSON.stringify(record);
  localStorage.setItem(PREVIEW_STORAGE(slug), payload);
  const ch = getChannel();
  ch?.postMessage({ slug, record });
  ch?.close();
}

export function clearPreview(slug: string) {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PREVIEW_STORAGE(slug));
}

export async function upsertPageContent(slug: string, rec: Omit<PageRecord, "slug">, title?: string) {
  const { data: userRes } = await supabase.auth.getUser();
  const payload = {
    slug,
    title: title ?? rec.title ?? slug,
    content: rec.content ?? {},
    seo_title: rec.seo_title ?? null,
    seo_description: rec.seo_description ?? null,
    og_image: rec.og_image ?? null,
    hero_image: rec.hero_image ?? null,
  };
  const { error } = await supabase.from("page_contents").upsert(payload, { onConflict: "slug" });
  if (error) throw error;
  await supabase.from("page_content_versions").insert({
    slug,
    content: payload.content,
    seo_title: payload.seo_title,
    seo_description: payload.seo_description,
    og_image: payload.og_image,
    hero_image: payload.hero_image,
    created_by: userRes.user?.id ?? null,
  });
  invalidatePageContent(slug);
}

export async function listPageContents(): Promise<PageRecord[]> {
  const { data, error } = await supabase
    .from("page_contents")
    .select("slug, title, content, seo_title, seo_description, og_image, hero_image")
    .order("slug");
  if (error) throw error;
  return (data ?? []).map((r: any) => ({ ...r, content: (r.content ?? {}) as PageContent }));
}

export async function listPageVersions(slug: string): Promise<PageVersion[]> {
  const { data, error } = await supabase
    .from("page_content_versions")
    .select("id, slug, content, seo_title, seo_description, og_image, hero_image, created_at, created_by")
    .eq("slug", slug)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []).map((r: any) => ({ ...r, content: (r.content ?? {}) as PageContent }));
}

export async function uploadPageMedia(file: File, slug: string): Promise<string> {
  const ext = file.name.split(".").pop() ?? "bin";
  const path = `${slug}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("marketing-media").upload(path, file, {
    cacheControl: "31536000",
    upsert: false,
    contentType: file.type,
  });
  if (error) throw error;
  const { data } = await supabase.storage
    .from("marketing-media")
    .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
  if (!data?.signedUrl) throw new Error("Could not sign URL");
  return data.signedUrl;
}

export async function listPageMedia(slug: string): Promise<{ path: string; url: string }[]> {
  const { data, error } = await supabase.storage.from("marketing-media").list(slug, { limit: 100, sortBy: { column: "created_at", order: "desc" } });
  if (error || !data) return [];
  const items = await Promise.all(
    data.filter((f) => f.name && !f.name.endsWith("/")).map(async (f) => {
      const path = `${slug}/${f.name}`;
      const { data: signed } = await supabase.storage
        .from("marketing-media")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      return { path, url: signed?.signedUrl ?? "" };
    }),
  );
  return items.filter((i) => i.url);
}
