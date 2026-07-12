import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  listAdminKb, upsertCategory, deleteCategory, upsertArticle, deleteArticle,
} from "@/lib/kb.functions";

export const Route = createFileRoute("/_authenticated/kb")({ component: KbAdmin });

function KbAdmin() {
  const qc = useQueryClient();
  const list = useServerFn(listAdminKb);
  const saveCat = useServerFn(upsertCategory);
  const delCat = useServerFn(deleteCategory);
  const saveArt = useServerFn(upsertArticle);
  const delArt = useServerFn(deleteArticle);

  const q = useQuery({ queryKey: ["kb-admin"], queryFn: () => list() });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["kb-admin"] });

  const mCat = useMutation({ mutationFn: (v: any) => saveCat({ data: v }), onSuccess: () => { invalidate(); toast.success("Category saved"); setCatName(""); setCatDesc(""); } });
  const mDelCat = useMutation({ mutationFn: (id: string) => delCat({ data: { id } }), onSuccess: invalidate });
  const mArt = useMutation({ mutationFn: (v: any) => saveArt({ data: v }), onSuccess: () => { invalidate(); toast.success("Article created"); setArtTitle(""); setArtContent(""); } });
  const mDelArt = useMutation({ mutationFn: (id: string) => delArt({ data: { id } }), onSuccess: invalidate });

  const [catName, setCatName] = useState("");
  const [catDesc, setCatDesc] = useState("");
  const [artTitle, setArtTitle] = useState("");
  const [artCategory, setArtCategory] = useState("");
  const [artContent, setArtContent] = useState("");

  const cats = (q.data as any)?.categories ?? [];
  const arts = (q.data as any)?.articles ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Knowledge Base</h1>
        <p className="text-sm text-muted-foreground">Manage help center categories and articles.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Categories</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
              <Input placeholder="Name" value={catName} onChange={(e) => setCatName(e.target.value)} />
              <Input placeholder="Description (optional)" value={catDesc} onChange={(e) => setCatDesc(e.target.value)} />
              <Button disabled={!catName || mCat.isPending} onClick={() => mCat.mutate({ name: catName, description: catDesc })}>
                <Plus className="mr-1 h-4 w-4" /> Add
              </Button>
            </div>
            <ul className="divide-y">
              {cats.map((c: any) => (
                <li key={c.id} className="flex items-center justify-between py-2">
                  <div>
                    <div className="text-sm font-medium">{c.name}</div>
                    <div className="text-xs text-muted-foreground">/{c.slug}</div>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => mDelCat.mutate(c.id)}><Trash2 className="h-4 w-4" /></Button>
                </li>
              ))}
              {cats.length === 0 && <li className="py-4 text-sm text-muted-foreground">No categories yet.</li>}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>New article</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Title" value={artTitle} onChange={(e) => setArtTitle(e.target.value)} />
            <select
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={artCategory}
              onChange={(e) => setArtCategory(e.target.value)}
            >
              <option value="">— No category —</option>
              {cats.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <Textarea rows={8} placeholder="Markdown / plain text content" value={artContent} onChange={(e) => setArtContent(e.target.value)} />
            <div className="flex gap-2">
              <Button disabled={!artTitle || !artContent || mArt.isPending}
                onClick={() => mArt.mutate({ title: artTitle, content: artContent, category_id: artCategory || null, published: false })}>
                Save draft
              </Button>
              <Button variant="secondary" disabled={!artTitle || !artContent || mArt.isPending}
                onClick={() => mArt.mutate({ title: artTitle, content: artContent, category_id: artCategory || null, published: true })}>
                Publish
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Articles ({arts.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Views</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {arts.map((a: any) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">
                    <Link to="/kb/$articleId" params={{ articleId: a.id }} className="hover:underline">{a.title}</Link>
                    <div className="text-xs text-muted-foreground">/{a.slug}</div>
                  </TableCell>
                  <TableCell className="text-sm">{cats.find((c: any) => c.id === a.category_id)?.name ?? "—"}</TableCell>
                  <TableCell>{a.views}</TableCell>
                  <TableCell>
                    <Badge variant={a.published ? "default" : "secondary"}>{a.published ? "Published" : "Draft"}</Badge>
                  </TableCell>
                  <TableCell className="text-xs">{new Date(a.updated_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => mDelArt.mutate(a.id)}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {arts.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground">No articles yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
