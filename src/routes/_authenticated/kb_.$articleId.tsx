import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getArticle, upsertArticle, deleteArticle, listAdminKb } from "@/lib/kb.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/kb_/$articleId")({
  component: EditArticle,
});

function EditArticle() {
  const { articleId } = Route.useParams();
  const navigate = useNavigate();
  const get = useServerFn(getArticle);
  const save = useServerFn(upsertArticle);
  const del = useServerFn(deleteArticle);
  const list = useServerFn(listAdminKb);

  const q = useQuery({ queryKey: ["kb-art", articleId], queryFn: () => get({ data: { id: articleId } }) });
  const cats = useQuery({ queryKey: ["kb-admin"], queryFn: () => list() });

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [published, setPublished] = useState(false);
  const [categoryId, setCategoryId] = useState<string>("");

  useEffect(() => {
    const a: any = q.data;
    if (!a) return;
    setTitle(a.title ?? ""); setSlug(a.slug ?? ""); setExcerpt(a.excerpt ?? "");
    setContent(a.content ?? ""); setPublished(!!a.published); setCategoryId(a.category_id ?? "");
  }, [q.data]);

  const mSave = useMutation({
    mutationFn: () => save({ data: { id: articleId, title, slug, excerpt, content, published, category_id: categoryId || null } }),
    onSuccess: () => toast.success("Saved"),
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
  const mDel = useMutation({
    mutationFn: () => del({ data: { id: articleId } }),
    onSuccess: () => { toast.success("Deleted"); navigate({ to: "/kb" }); },
  });

  if (q.isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Edit article</h1>
        <div className="flex gap-2">
          <Button variant="destructive" onClick={() => mDel.mutate()}>Delete</Button>
          <Button onClick={() => mSave.mutate()} disabled={mSave.isPending}>Save</Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Content</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <Label>Slug</Label>
              <Input value={slug} onChange={(e) => setSlug(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Category</Label>
            <select className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">— No category —</option>
              {((cats.data as any)?.categories ?? []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <Label>Excerpt</Label>
            <Input value={excerpt} onChange={(e) => setExcerpt(e.target.value)} />
          </div>
          <div>
            <Label>Content</Label>
            <Textarea rows={18} value={content} onChange={(e) => setContent(e.target.value)} />
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={published} onCheckedChange={setPublished} id="pub" />
            <Label htmlFor="pub">Published</Label>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
