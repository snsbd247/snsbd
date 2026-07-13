import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  listPageContents,
  listPageMedia,
  listPageVersions,
  upsertPageContent,
  uploadPageMedia,
  broadcastPreview,
  clearPreview,
  type PageContent,
  type PageRecord,
  type PageVersion,
} from "@/lib/page-content";

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
  const [records, setRecords] = useState<Record<string, PageRecord>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const rows = await listPageContents();
        const map: Record<string, PageRecord> = {};
        for (const r of rows) map[r.slug] = r;
        setRecords(map);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const setRecord = (slug: string, updater: (r: PageRecord) => PageRecord) =>
    setRecords((s) => ({ ...s, [slug]: updater(s[slug] ?? { slug, content: {} }) }));

  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Website Pages</h1>
        <p className="text-sm text-muted-foreground">Edit content, SEO & media. Live preview streams unsaved edits to the site.</p>
      </div>

      <Tabs defaultValue={PAGES[0].slug} className="w-full">
        <TabsList className="flex h-auto flex-wrap justify-start gap-1">
          {PAGES.map((p) => (
            <TabsTrigger key={p.slug} value={p.slug}>{p.title}</TabsTrigger>
          ))}
        </TabsList>
        {PAGES.map((page) => (
          <TabsContent key={page.slug} value={page.slug} className="mt-4">
            <PageEditor
              page={page}
              record={records[page.slug] ?? { slug: page.slug, content: {} }}
              onChange={(u) => setRecord(page.slug, u)}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function PageEditor({
  page,
  record,
  onChange,
}: {
  page: PageDef;
  record: PageRecord;
  onChange: (u: (r: PageRecord) => PageRecord) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [livePreview, setLivePreview] = useState(false);
  const [media, setMedia] = useState<{ path: string; url: string }[]>([]);
  const [versions, setVersions] = useState<PageVersion[]>([]);
  const [rawJson, setRawJson] = useState(JSON.stringify(record.content ?? {}, null, 2));

  useEffect(() => setRawJson(JSON.stringify(record.content ?? {}, null, 2)), [page.slug]);

  useEffect(() => {
    listPageMedia(page.slug).then(setMedia).catch(() => setMedia([]));
    listPageVersions(page.slug).then(setVersions).catch(() => setVersions([]));
  }, [page.slug]);

  // Broadcast draft to any open preview window
  useEffect(() => {
    if (!livePreview) return;
    broadcastPreview(page.slug, record);
  }, [livePreview, record, page.slug]);

  const previewUrl = `${page.path}?preview=1`;

  const updateContent = (key: string, v: string) =>
    onChange((r) => ({ ...r, content: { ...(r.content ?? {}), [key]: v } }));

  const updateField = <K extends keyof PageRecord>(key: K, v: PageRecord[K]) =>
    onChange((r) => ({ ...r, [key]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await upsertPageContent(page.slug, {
        title: page.title,
        content: record.content ?? {},
        seo_title: record.seo_title ?? null,
        seo_description: record.seo_description ?? null,
        og_image: record.og_image ?? null,
        hero_image: record.hero_image ?? null,
      }, page.title);
      clearPreview(page.slug);
      toast.success(`${page.title} saved`);
      listPageVersions(page.slug).then(setVersions);
    } catch (e: any) {
      toast.error(e.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const onUpload = async (file: File) => {
    try {
      const url = await uploadPageMedia(file, page.slug);
      toast.success("Uploaded");
      setMedia((m) => [{ path: url, url }, ...m]);
      return url;
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
      return null;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>{page.title}</CardTitle>
          <a href={page.path} target="_blank" rel="noreferrer" className="text-xs text-emerald-600 hover:underline">
            {page.path} ↗
          </a>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-md border px-3 py-1.5">
            <Switch id={`lp-${page.slug}`} checked={livePreview} onCheckedChange={setLivePreview} />
            <Label htmlFor={`lp-${page.slug}`} className="cursor-pointer text-xs">Live preview</Label>
          </div>
          <Button variant="outline" onClick={() => { broadcastPreview(page.slug, record); window.open(previewUrl, "_blank"); }}>
            Open Preview
          </Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="content">
          <TabsList>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="seo">SEO</TabsTrigger>
            <TabsTrigger value="media">Media</TabsTrigger>
            <TabsTrigger value="versions">History</TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="mt-4 space-y-4">
            {page.fields.map((f) => (
              <div key={f.key} className="space-y-1.5">
                <Label>{f.label}</Label>
                {f.type === "textarea" ? (
                  <Textarea rows={2} value={(record.content as PageContent)?.[f.key] ?? ""} onChange={(e) => updateContent(f.key, e.target.value)} />
                ) : (
                  <Input value={(record.content as PageContent)?.[f.key] ?? ""} onChange={(e) => updateContent(f.key, e.target.value)} />
                )}
              </div>
            ))}
            <details className="rounded border p-3 text-sm">
              <summary className="cursor-pointer font-medium">Advanced: raw JSON</summary>
              <Textarea
                className="mt-3 font-mono text-xs"
                rows={10}
                value={rawJson}
                onChange={(e) => {
                  setRawJson(e.target.value);
                  try {
                    const parsed = JSON.parse(e.target.value);
                    onChange((r) => ({ ...r, content: parsed }));
                  } catch { /* keep typing */ }
                }}
              />
            </details>
          </TabsContent>

          <TabsContent value="seo" className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label>SEO Title <span className="text-xs text-muted-foreground">(≤60 chars)</span></Label>
              <Input maxLength={80} value={record.seo_title ?? ""} onChange={(e) => updateField("seo_title", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Meta Description <span className="text-xs text-muted-foreground">(≤160 chars)</span></Label>
              <Textarea rows={2} maxLength={200} value={record.seo_description ?? ""} onChange={(e) => updateField("seo_description", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>OpenGraph Image URL</Label>
              <div className="flex gap-2">
                <Input value={record.og_image ?? ""} onChange={(e) => updateField("og_image", e.target.value)} placeholder="https://…" />
                <UploadButton onUpload={async (f) => { const url = await onUpload(f); if (url) updateField("og_image", url); }} />
              </div>
              {record.og_image && <img src={record.og_image} alt="OG preview" className="mt-2 h-24 rounded border object-cover" />}
            </div>
          </TabsContent>

          <TabsContent value="media" className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label>Hero / Background Image</Label>
              <div className="flex gap-2">
                <Input value={record.hero_image ?? ""} onChange={(e) => updateField("hero_image", e.target.value)} placeholder="https://…" />
                <UploadButton onUpload={async (f) => { const url = await onUpload(f); if (url) updateField("hero_image", url); }} />
              </div>
              {record.hero_image && <img src={record.hero_image} alt="Hero preview" className="mt-2 h-32 rounded border object-cover" />}
            </div>
            <div>
              <div className="mb-2 text-sm font-medium">Uploaded media for this page</div>
              {media.length === 0 ? (
                <div className="text-xs text-muted-foreground">No media uploaded yet.</div>
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                  {media.map((m) => (
                    <button
                      key={m.path}
                      type="button"
                      className="group relative overflow-hidden rounded border hover:ring-2 hover:ring-primary"
                      onClick={() => updateField("hero_image", m.url)}
                      title="Use as hero image"
                    >
                      <img src={m.url} alt="" className="h-20 w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="versions" className="mt-4">
            {versions.length === 0 ? (
              <div className="text-xs text-muted-foreground">No history yet.</div>
            ) : (
              <div className="divide-y rounded border">
                {versions.map((v) => (
                  <div key={v.id} className="flex items-center justify-between gap-3 p-3">
                    <div>
                      <div className="text-sm font-medium">{new Date(v.created_at).toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground line-clamp-1">
                        {(v.content as PageContent)?.hero_title || v.seo_title || "—"}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => {
                        onChange(() => ({
                          slug: page.slug,
                          content: (v.content as PageContent) ?? {},
                          seo_title: v.seo_title,
                          seo_description: v.seo_description,
                          og_image: v.og_image,
                          hero_image: v.hero_image,
                        }));
                        toast.success("Loaded into editor — click Save to restore");
                      }}>Load</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function UploadButton({ onUpload }: { onUpload: (f: File) => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  return (
    <label className="inline-flex cursor-pointer items-center rounded-md border bg-background px-3 text-sm hover:bg-muted">
      {busy ? "…" : "Upload"}
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          setBusy(true);
          try { await onUpload(f); } finally { setBusy(false); e.currentTarget.value = ""; }
        }}
      />
    </label>
  );
}
