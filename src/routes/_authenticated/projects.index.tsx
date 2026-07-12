import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, ListChecks, Check, Circle, ChevronUp, ChevronDown, Activity } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { formatBDT, formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db-shim";

export const Route = createFileRoute("/_authenticated/projects/")({
  component: ProjectsPage,
});

const empty = { customer_id: "", name: "", description: "", status: "planning", start_date: "", end_date: "", budget: "0" };

function ProjectsPage() {
  const { role } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [timelineFor, setTimelineFor] = useState<any>(null);

  const { data: projects, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data } = await db.from("projects").select("*, profiles(full_name, email)").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: allMilestones } = useQuery({
    queryKey: ["all-milestones"],
    queryFn: async () => (await db.from("project_milestones").select("project_id,title,due_date,completed,sort_order").order("sort_order").order("due_date", { ascending: true, nullsFirst: false })).data ?? [],
  });
  const progressByProject = (allMilestones ?? []).reduce<Record<string, { total: number; done: number; next: any }>>((acc, m: any) => {
    const g = acc[m.project_id] ?? { total: 0, done: 0, next: null };
    g.total += 1; if (m.completed) g.done += 1;
    if (!m.completed && !g.next) g.next = m;
    acc[m.project_id] = g; return acc;
  }, {});

  const { data: customers } = useQuery({
    queryKey: ["customer-list"], enabled: role === "admin",
    queryFn: async () => (await db.from("profiles").select("id, full_name, email")).data ?? [],
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await db.from("projects").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["projects"] }); },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{role === "admin" ? "Projects" : "My Projects"}</h1>
          <p className="text-sm text-muted-foreground">Software development and delivery projects.</p>
        </div>
        {role === "admin" && <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="mr-2 h-4 w-4" />New project</Button>}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                {role === "admin" && <TableHead>Customer</TableHead>}
                <TableHead>Status</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Budget</TableHead>
                <TableHead className="min-w-[180px]">Progress</TableHead>
                <TableHead className="w-32 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={role === "admin" ? 7 : 6} className="py-8 text-center text-sm text-muted-foreground">Loading…</TableCell></TableRow>}
              {!isLoading && (projects ?? []).length === 0 && <TableRow><TableCell colSpan={role === "admin" ? 7 : 6} className="py-8 text-center text-sm text-muted-foreground">No projects.</TableCell></TableRow>}
              {(projects ?? []).map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    <Link to="/projects/$projectId" params={{ projectId: p.id }} className="hover:underline text-primary">{p.name}</Link>
                    <div className="text-xs text-muted-foreground line-clamp-1">{p.description}</div>
                  </TableCell>
                  {role === "admin" && <TableCell>{p.profiles?.full_name ?? p.profiles?.email ?? "—"}</TableCell>}
                  <TableCell><Badge variant="secondary" className="capitalize">{p.status.replace("_", " ")}</Badge></TableCell>
                  <TableCell className="text-xs">{formatDate(p.start_date)} → {formatDate(p.end_date)}</TableCell>
                  <TableCell>{formatBDT(p.budget)}</TableCell>
                  <TableCell><ProgressCell stats={progressByProject[p.id]} /></TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" title="Timeline" onClick={() => setTimelineFor(p)}><ListChecks className="h-4 w-4" /></Button>
                    {role === "admin" && (
                      <>
                        <Button size="icon" variant="ghost" onClick={() => { setEditing(p); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => { if (confirm("Delete?")) del.mutate(p.id); }}><Trash2 className="h-4 w-4" /></Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {role === "admin" && <ProjectDialog open={open} onOpenChange={setOpen} editing={editing} customers={customers ?? []} />}
      <TimelineDialog project={timelineFor} onOpenChange={(o) => !o && setTimelineFor(null)} canEdit={role === "admin"} />
    </div>
  );
}

function ProjectDialog({ open, onOpenChange, editing, customers }: any) {
  const qc = useQueryClient();
  const [f, setF] = useState<any>(empty);
  useEffect(() => {
    if (open) {
      if (editing) setF({ customer_id: editing.customer_id, name: editing.name, description: editing.description ?? "", status: editing.status, start_date: editing.start_date ?? "", end_date: editing.end_date ?? "", budget: String(editing.budget ?? "0") });
      else setF(empty);
    }
  }, [open, editing]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...f, budget: Number(f.budget) || 0, start_date: f.start_date || null, end_date: f.end_date || null };
      if (editing) { const { error } = await db.from("projects").update(payload).eq("id", editing.id); if (error) throw error; }
      else { const { error } = await db.from("projects").insert(payload); if (error) throw error; }
    },
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["projects"] }); onOpenChange(false); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{editing ? "Edit project" : "New project"}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div>
            <Label>Customer</Label>
            <Select value={f.customer_id} onValueChange={(v) => setF({ ...f, customer_id: v })}>
              <SelectTrigger><SelectValue placeholder="Choose customer" /></SelectTrigger>
              <SelectContent>{customers.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.full_name ?? c.email}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Name</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
          <div><Label>Description</Label><Textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
          <div>
            <Label>Status</Label>
            <Select value={f.status} onValueChange={(v) => setF({ ...f, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="planning">Planning</SelectItem>
                <SelectItem value="in_progress">In progress</SelectItem>
                <SelectItem value="on_hold">On hold</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Start</Label><Input type="date" value={f.start_date} onChange={(e) => setF({ ...f, start_date: e.target.value })} /></div>
            <div><Label>End</Label><Input type="date" value={f.end_date} onChange={(e) => setF({ ...f, end_date: e.target.value })} /></div>
          </div>
          <div><Label>Budget (৳)</Label><Input type="number" value={f.budget} onChange={(e) => setF({ ...f, budget: e.target.value })} /></div>
        </div>
        <DialogFooter><Button onClick={() => save.mutate()} disabled={!f.customer_id || !f.name || save.isPending}>Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TimelineDialog({ project, onOpenChange, canEdit }: { project: any; onOpenChange: (o: boolean) => void; canEdit: boolean }) {
  const qc = useQueryClient();
  const open = !!project;
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");

  const { data: milestones, isLoading } = useQuery({
    queryKey: ["project-milestones", project?.id],
    enabled: open,
    queryFn: async () => {
      const { data } = await db.from("project_milestones").select("*").eq("project_id", project.id).order("sort_order", { ascending: true }).order("due_date", { ascending: true, nullsFirst: false }).order("created_at", { ascending: true });
      return data ?? [];
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["project-milestones", project?.id] });
    qc.invalidateQueries({ queryKey: ["all-milestones"] });
    qc.invalidateQueries({ queryKey: ["project-activity", project?.id] });
  };

  const { data: activity } = useQuery({
    queryKey: ["project-activity", project?.id],
    enabled: open,
    queryFn: async () => (await db.from("project_activity_log").select("*").eq("project_id", project.id).order("created_at", { ascending: false }).limit(50)).data ?? [],
  });

  const add = useMutation({
    mutationFn: async () => {
      const nextOrder = (milestones ?? []).reduce((mx: number, m: any) => Math.max(mx, m.sort_order ?? 0), 0) + 10;
      const { error } = await db.from("project_milestones").insert({
        project_id: project.id, title, description: description || null, due_date: dueDate || null, sort_order: nextOrder,
      });
      if (error) throw error;
    },
    onSuccess: () => { setTitle(""); setDueDate(""); setDescription(""); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async (m: any) => {
      const { error } = await db.from("project_milestones").update({
        completed: !m.completed, completed_at: !m.completed ? new Date().toISOString() : null,
      }).eq("id", m.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("project_milestones").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
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
      const { error: e1 } = await db.from("project_milestones").update({ sort_order: na }).eq("id", m.id);
      if (e1) throw e1;
      const { error: e2 } = await db.from("project_milestones").update({ sort_order: nb }).eq("id", other.id);
      if (e2) throw e2;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Timeline — {project?.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative border-l-2 border-border pl-6 space-y-4 max-h-[50vh] overflow-y-auto py-2">
            {isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
            {!isLoading && (milestones ?? []).length === 0 && (
              <div className="text-sm text-muted-foreground">No milestones yet.</div>
            )}
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
                      <Button size="icon" variant="ghost" onClick={() => { if (confirm("Delete milestone?")) remove.mutate(m.id); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {canEdit && (
            <div className="border-t pt-4 space-y-3">
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

          <div className="border-t pt-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium"><Activity className="h-4 w-4" />Activity</div>
            <div className="max-h-40 overflow-y-auto space-y-1 text-xs">
              {(activity ?? []).length === 0 && <div className="text-muted-foreground">No activity yet.</div>}
              {(activity ?? []).map((a: any) => (
                <div key={a.id} className="flex justify-between gap-2 text-muted-foreground">
                  <span><span className="capitalize font-medium text-foreground">{a.action}</span> — {a.milestone_title}</span>
                  <span className="shrink-0">{formatDate(a.created_at)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ProgressCell({ stats }: { stats?: { total: number; done: number; next: any } }) {
  if (!stats || stats.total === 0) return <span className="text-xs text-muted-foreground">No milestones</span>;
  const pct = Math.round((stats.done / stats.total) * 100);
  return (
    <div className="space-y-1 min-w-[160px]">
      <div className="text-xs text-muted-foreground">{stats.done}/{stats.total} • {pct}%</div>
      <Progress value={pct} className="h-1.5" />
      {stats.next && (
        <div className="text-xs text-muted-foreground line-clamp-1">
          Next: {stats.next.title}{stats.next.due_date ? ` (${formatDate(stats.next.due_date)})` : ""}
        </div>
      )}
    </div>
  );
}
