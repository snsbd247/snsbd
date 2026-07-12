import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

async function assertAdmin(context: any) {
  const { data: ok } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!ok) throw new Error("Admins only");
}

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "article";
}

/** PUBLIC — help center list */
export const listPublicKb = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = publicClient();
  const [{ data: cats }, { data: arts }] = await Promise.all([
    supabase.from("kb_categories").select("id, slug, name, description, sort_order").order("sort_order"),
    supabase.from("kb_articles").select("id, slug, title, excerpt, category_id, updated_at").eq("published", true).order("updated_at", { ascending: false }),
  ]);
  return { categories: cats ?? [], articles: arts ?? [] };
});

export const getPublicArticle = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => d)
  .handler(async ({ data }) => {
    const supabase = publicClient();
    const { data: art } = await supabase
      .from("kb_articles")
      .select("id, slug, title, excerpt, content, updated_at, views, category_id")
      .eq("slug", data.slug)
      .eq("published", true)
      .maybeSingle();
    if (!art) return { article: null };
    // Best-effort view increment
    await supabase.from("kb_articles").update({ views: (art.views ?? 0) + 1 }).eq("id", art.id);
    return { article: art };
  });

/** ADMIN */
export const listAdminKb = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const [{ data: cats }, { data: arts }] = await Promise.all([
      context.supabase.from("kb_categories").select("*").order("sort_order"),
      context.supabase.from("kb_articles").select("id, slug, title, published, category_id, updated_at, views").order("updated_at", { ascending: false }),
    ]);
    return { categories: cats ?? [], articles: arts ?? [] };
  });

export const upsertCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id?: string; name: string; slug?: string; description?: string; sort_order?: number }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const payload = { name: data.name, slug: data.slug || slugify(data.name), description: data.description ?? null, sort_order: data.sort_order ?? 0 };
    const q = data.id
      ? context.supabase.from("kb_categories").update(payload).eq("id", data.id).select().single()
      : context.supabase.from("kb_categories").insert(payload).select().single();
    const { data: row, error } = await q;
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("kb_categories").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getArticle = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: art, error } = await context.supabase.from("kb_articles").select("*").eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    return art;
  });

export const upsertArticle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id?: string; title: string; slug?: string; category_id?: string | null; excerpt?: string; content: string; published?: boolean }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const payload = {
      title: data.title,
      slug: data.slug || slugify(data.title),
      category_id: data.category_id ?? null,
      excerpt: data.excerpt ?? null,
      content: data.content,
      published: data.published ?? false,
      author_id: context.userId,
    };
    const q = data.id
      ? context.supabase.from("kb_articles").update(payload).eq("id", data.id).select().single()
      : context.supabase.from("kb_articles").insert(payload).select().single();
    const { data: row, error } = await q;
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteArticle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("kb_articles").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
