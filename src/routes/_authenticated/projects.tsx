import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, ListChecks, Check, Circle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { formatBDT, formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/projects")({
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
      const { data } = await supabase.from("projects").select("*, profiles(full_name, email)").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: customers } = useQuery({
    queryKey: ["customer-list"], enabled: role === "admin",
    queryFn: async () => (await supabase.from("profiles").select("id, full_name, email")).data ?? [],
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("projects").delete().eq("id", id); if (error) throw error; },
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
                <TableHead>Timeline</TableHead>
                <TableHead>Budget</TableHead>
                <TableHead className="w-32 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={role === "admin" ? 6 : 5} className="py-8 text-center text-sm text-muted-foreground">Loading…</TableCell></TableRow>}
              {!isLoading && (projects ?? []).length === 0 && <TableRow><TableCell colSpan={role === "admin" ? 6 : 5} className="py-8 text-center text-sm text-muted-foreground">No projects.</TableCell></TableRow>}
              {(projects ?? []).map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}<div className="text-xs text-muted-foreground line-clamp-1">{p.description}</div></TableCell>
                  {role === "admin" && <TableCell>{p.profiles?.full_name ?? p.profiles?.email ?? "—"}</TableCell>}
                  <TableCell><Badge variant="secondary" className="capitalize">{p.status.replace("_", " ")}</Badge></TableCell>
                  <TableCell className="text-xs">{formatDate(p.start_date)} → {formatDate(p.end_date)}</TableCell>
                  <TableCell>{formatBDT(p.budget)}</TableCell>
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
      if (editing) { const { error } = await supabase.from("projects").update(payload).eq("id", editing.id); if (error) throw error; }
      else { const { error } = await supabase.from("projects").insert(payload); if (error) throw error; }
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
