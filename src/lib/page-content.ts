import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PageContent = Record<string, string>;

const cache = new Map<string, PageContent>();
const listeners = new Map<string, Set<(v: PageContent) => void>>();

async function fetchPageContent(slug: string): Promise<PageContent> {
  const { data } = await supabase
    .from("page_contents")
    .select("content")
    .eq("slug", slug)
    .maybeSingle();
  return ((data?.content as PageContent) ?? {}) as PageContent;
}

export function usePageContent(slug: string, defaults: PageContent = {}): PageContent {
  const [content, setContent] = useState<PageContent>(() => ({ ...defaults, ...(cache.get(slug) ?? {}) }));

  useEffect(() => {
    let alive = true;
    const apply = (v: PageContent) => alive && setContent({ ...defaults, ...v });
    if (cache.has(slug)) apply(cache.get(slug)!);
    fetchPageContent(slug).then((v) => {
      cache.set(slug, v);
      apply(v);
      listeners.get(slug)?.forEach((cb) => cb(v));
    });
    let set = listeners.get(slug);
    if (!set) {
      set = new Set();
      listeners.set(slug, set);
    }
    set.add(apply);
    return () => {
      alive = false;
      listeners.get(slug)?.delete(apply);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  return content;
}

export function invalidatePageContent(slug: string) {
  cache.delete(slug);
  fetchPageContent(slug).then((v) => {
    cache.set(slug, v);
    listeners.get(slug)?.forEach((cb) => cb(v));
  });
}

export async function upsertPageContent(slug: string, content: PageContent, title?: string) {
  const { error } = await supabase
    .from("page_contents")
    .upsert({ slug, content, title: title ?? slug }, { onConflict: "slug" });
  if (error) throw error;
  invalidatePageContent(slug);
}

export async function listPageContents() {
  const { data, error } = await supabase
    .from("page_contents")
    .select("slug, title, content, updated_at")
    .order("slug");
  if (error) throw error;
  return data ?? [];
}
