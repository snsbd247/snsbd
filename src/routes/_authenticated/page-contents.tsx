import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { listPageContents, upsertPageContent, type PageContent } from "@/lib/page-content";

type PageField = { key: string; label: string; type?: "text" | "textarea" };
type PageDef = { slug: string; title: string; path: string; fields: PageField[] };

const HERO_FIELDS: PageField[] = [
  { key: "badge", label: "Top Badge" },
  { key: "hero_title", label: "Hero Title", type: "textarea" },
  { key: "hero_highlight", label: "Hero Highlight (gradient word)" },
  { key: "hero_subtitle", label: "Hero Subtitle", type: "textarea" },
  { key: "cta_primary", label: "Primary CTA Label" },
  { key: "cta_secondary", label: "Secondary CTA Label" },
];

const PAGES: PageDef[] = [
  { slug: "home", title: "Home", path: "/", fields: HERO_FIELDS },
  { slug: "web-hosting", title: "Web Hosting", path: "/web-hosting", fields: HERO_FIELDS },
  { slug: "bdix-hosting", title: "BDIX Hosting", path: "/bdix-hosting", fields: HERO_FIELDS },
  { slug: "reseller-hosting", title: "Reseller Hosting", path: "/reseller-hosting", fields: HERO_FIELDS },
  { slug: "vps", title: "VPS", path: "/vps", fields: HERO_FIELDS },
  { slug: "email-hosting", title: "Email Hosting", path: "/email-hosting", fields: HERO_FIELDS },
  { slug: "register-domain", title: "Register Domain", path: "/register-domain", fields: HERO_FIELDS },
  { slug: "about", title: "About", path: "/about", fields: HERO_FIELDS },
  { slug: "contact", title: "Contact", path: "/contact", fields: HERO_FIELDS },
  { slug: "support", title: "Support", path: "/support", fields: HERO_FIELDS },
  { slug: "help", title: "Help Center", path: "/help", fields: HERO_FIELDS },
];

export const Route = createFileRoute("/_authenticated/page-contents")({
  component: PageContentsAdmin,
});

function PageContentsAdmin() {
  const [values, setValues] = useState<Record<string, PageContent>>({});
  const [raw, setRaw] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const rows = await listPageContents();
        const map: Record<string, PageContent> = {};
        const rawMap: Record<string, string> = {};
        for (const r of rows) {
          map[r.slug] = (r.content as PageContent) ?? {};
          rawMap[r.slug] = JSON.stringify(r.content ?? {}, null, 2);
        }
        setValues(map);
        setRaw(rawMap);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const update = (slug: string, key: string, v: string) =>
    setValues((s) => ({ ...s, [slug]: { ...(s[slug] ?? {}), [key]: v } }));

  const save = async (page: PageDef) => {
    setSaving(page.slug);
    try {
      await upsertPageContent(page.slug, values[page.slug] ?? {}, page.title);
      toast.success(`${page.title} saved`);
    } catch (e: any) {
      toast.error(e.message ?? "Save failed");
    } finally {
      setSaving(null);
    }
  };

  const saveRaw = async (page: PageDef) => {
    try {
      const parsed = JSON.parse(raw[page.slug] || "{}");
      setValues((s) => ({ ...s, [page.slug]: parsed }));
      await upsertPageContent(page.slug, parsed, page.title);
      toast.success(`${page.title} JSON saved`);
    } catch (e: any) {
      toast.error(e.message ?? "Invalid JSON");
    }
  };

  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Website Pages</h1>
        <p className="text-sm text-muted-foreground">Edit hero text and CTA labels on every marketing page.</p>
      </div>

      <Tabs defaultValue={PAGES[0].slug} className="w-full">
        <TabsList className="flex h-auto flex-wrap justify-start gap-1">
          {PAGES.map((p) => (
            <TabsTrigger key={p.slug} value={p.slug}>{p.title}</TabsTrigger>
          ))}
        </TabsList>
        {PAGES.map((page) => (
          <TabsContent key={page.slug} value={page.slug} className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>{page.title}</CardTitle>
                  <a href={page.path} target="_blank" rel="noreferrer" className="text-xs text-emerald-600 hover:underline">
                    {page.path} ↗
                  </a>
                </div>
                <Button onClick={() => save(page)} disabled={saving === page.slug}>
                  {saving === page.slug ? "Saving…" : "Save"}
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {page.fields.map((f) => (
                  <div key={f.key} className="space-y-1.5">
                    <Label>{f.label}</Label>
                    {f.type === "textarea" ? (
                      <Textarea
                        rows={2}
                        value={values[page.slug]?.[f.key] ?? ""}
                        onChange={(e) => update(page.slug, f.key, e.target.value)}
                      />
                    ) : (
                      <Input
                        value={values[page.slug]?.[f.key] ?? ""}
                        onChange={(e) => update(page.slug, f.key, e.target.value)}
                      />
                    )}
                  </div>
                ))}

                <details className="rounded border p-3 text-sm">
                  <summary className="cursor-pointer font-medium">Advanced: raw JSON</summary>
                  <Textarea
                    className="mt-3 font-mono text-xs"
                    rows={10}
                    value={raw[page.slug] ?? JSON.stringify(values[page.slug] ?? {}, null, 2)}
                    onChange={(e) => setRaw((s) => ({ ...s, [page.slug]: e.target.value }))}
                  />
                  <div className="mt-2 flex justify-end">
                    <Button size="sm" variant="outline" onClick={() => saveRaw(page)}>Save JSON</Button>
                  </div>
                </details>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
