import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Plus, Trash2, Check, Circle, ChevronUp, ChevronDown, Activity, Loader2, Pencil, X, Save } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { formatBDT, formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/projects/$projectId")({
  component: ProjectDetailPage,
});

function ProjectDetailPage() {
  const { projectId } = Route.useParams();
  const { role } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const canEdit = role === "admin";

  const { data: project, isLoading } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*, profiles(full_name, email)").eq("id", projectId).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: milestones } = useQuery({
    queryKey: ["project-milestones", projectId],
    queryFn: async () => (await supabase.from("project_milestones").select("*").eq("project_id", projectId).order("sort_order").order("due_date", { ascending: true, nullsFirst: false }).order("created_at")).data ?? [],
  });

  const { data: activity } = useQuery({
    queryKey: ["project-activity", projectId],
    queryFn: async () => (await supabase.from("project_activity_log").select("*").eq("project_id", projectId).order("created_at", { ascending: false }).limit(50)).data ?? [],
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["project-milestones", projectId] });
    qc.invalidateQueries({ queryKey: ["project-activity", projectId] });
    qc.invalidateQueries({ queryKey: ["all-milestones"] });
  };

  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");

  const add = useMutation({
    mutationFn: async () => {
      const nextOrder = (milestones ?? []).reduce((mx: number, m: any) => Math.max(mx, m.sort_order ?? 0), 0) + 10;
      const { error } = await supabase.from("project_milestones").insert({
        project_id: projectId, title, description: description || null, due_date: dueDate || null, sort_order: nextOrder,
      });
      if (error) throw error;
    },
    onSuccess: () => { setTitle(""); setDueDate(""); setDescription(""); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async (m: any) => {
      const { error } = await supabase.from("project_milestones").update({
        completed: !m.completed, completed_at: !m.completed ? new Date().toISOString() : null,
      }).eq("id", m.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("project_milestones").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDue, setEditDue] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const startEdit = (m: any) => { setEditingId(m.id); setEditTitle(m.title); setEditDue(m.due_date ?? ""); setEditDesc(m.description ?? ""); };
  const cancelEdit = () => { setEditingId(null); };

  const update = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("project_milestones").update({
        title: editTitle, description: editDesc || null, due_date: editDue || null,
      }).eq("id", editingId!);
      if (error) throw error;
    },
    onSuccess: () => { cancelEdit(); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const reorder = useMutation({
    mutationFn: async ({ m, dir }: { m: any; dir: -1 | 1 }) => {
      const list = milestones ?? [];
      const i = list.findIndex((x: any) => x.id === m.id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= list.length) return;
      const other: any = list[j];
      const a = m.sort_order ?? 0, b = other.sort_order ?? 0;
      const [na, nb] = a === b ? [b - 1, b + 1] : [b, a];
      const { error: e1 } = await supabase.from("project_milestones").update({ sort_order: na }).eq("id", m.id); if (e1) throw e1;
      const { error: e2 } = await supabase.from("project_milestones").update({ sort_order: nb }).eq("id", other.id); if (e2) throw e2;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground p-6"><Loader2 className="h-4 w-4 animate-spin" />Loading project…</div>
  );
  if (!project) return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">Project not found.</div>
      <Button variant="outline" onClick={() => navigate({ to: "/projects" })}><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
    </div>
  );

  const total = (milestones ?? []).length;
  const done = (milestones ?? []).filter((m: any) => m.completed).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const next = (milestones ?? []).find((m: any) => !m.completed);
  const milestonesLoading = milestones === undefined;
  const activityLoading = activity === undefined;

  return (
    <div className="space-y-6 max-w-4xl">
      <nav className="text-xs text-muted-foreground flex items-center gap-1.5" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-foreground">Home</Link>
        <span>/</span>
        <Link to="/projects" className="hover:text-foreground">Projects</Link>
        <span>/</span>
        <span className="text-foreground font-medium truncate max-w-[240px]">{project.name}</span>
      </nav>
      <div>
        <Button variant="outline" size="sm" onClick={() => navigate({ to: "/projects" })}>
          <ArrowLeft className="mr-2 h-4 w-4" />Back to projects
        </Button>
      </div>

      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{project.name}</h1>
          <Badge variant="secondary" className="capitalize">{project.status.replace("_", " ")}</Badge>
        </div>
        {project.description && <p className="mt-2 text-sm text-muted-foreground">{project.description}</p>}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Customer</div><div className="text-sm font-medium mt-1">{project.profiles?.full_name ?? project.profiles?.email ?? "—"}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Start</div><div className="text-sm font-medium mt-1">{formatDate(project.start_date)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">End</div><div className="text-sm font-medium mt-1">{formatDate(project.end_date)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Budget</div><div className="text-sm font-medium mt-1">{formatBDT(project.budget)}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Progress</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <div className="text-sm text-muted-foreground">{done}/{total} milestones • {pct}%</div>
          <Progress value={pct} className="h-2" />
          {next && <div className="text-xs text-muted-foreground">Next: {next.title}{next.due_date ? ` (${formatDate(next.due_date)})` : ""}</div>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Milestones</CardTitle></CardHeader>
        <CardContent>
          <div className="relative border-l-2 border-border pl-6 space-y-4 py-2">
            {total === 0 && <div className="text-sm text-muted-foreground">No milestones yet.</div>}
            {(milestones ?? []).map((m: any) => (
              <div key={m.id} className="relative">
                <div className={`absolute -left-[31px] top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 ${m.completed ? "bg-primary border-primary text-primary-foreground" : "bg-background border-border"}`}>
                  {m.completed ? <Check className="h-3 w-3" /> : <Circle className="h-2 w-2" />}
                </div>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className={`text-sm font-medium ${m.completed ? "line-through text-muted-foreground" : ""}`}>{m.title}</div>
                    {m.description && <div className="text-xs text-muted-foreground mt-0.5">{m.description}</div>}
                    <div className="text-xs text-muted-foreground mt-1">
                      {m.due_date ? `Due ${formatDate(m.due_date)}` : "No due date"}
                      {m.completed && m.completed_at && ` • Completed ${formatDate(m.completed_at)}`}
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button size="icon" variant="ghost" onClick={() => reorder.mutate({ m, dir: -1 })}><ChevronUp className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => reorder.mutate({ m, dir: 1 })}><ChevronDown className="h-4 w-4" /></Button>
                      <Checkbox checked={m.completed} onCheckedChange={() => toggle.mutate(m)} />
                      <Button size="icon" variant="ghost" onClick={() => { if (confirm("Delete milestone?")) remove.mutate(m.id); }}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {canEdit && (
            <div className="border-t mt-6 pt-4 space-y-3">
              <div className="grid grid-cols-[1fr_180px] gap-2">
                <Input placeholder="Milestone title" value={title} onChange={(e) => setTitle(e.target.value)} />
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
              <Textarea placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
              <div className="flex justify-end">
                <Button onClick={() => add.mutate()} disabled={!title.trim() || add.isPending}>
                  <Plus className="mr-2 h-4 w-4" />Add milestone
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4" />Activity</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-1 text-xs">
            {(activity ?? []).length === 0 && <div className="text-muted-foreground">No activity yet.</div>}
            {(activity ?? []).map((a: any) => (
              <div key={a.id} className="flex justify-between gap-2 text-muted-foreground">
                <span><span className="capitalize font-medium text-foreground">{a.action}</span> — {a.milestone_title}</span>
                <span className="shrink-0">{formatDate(a.created_at)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
