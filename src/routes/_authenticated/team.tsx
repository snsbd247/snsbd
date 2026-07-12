import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { formatBDT, formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db-shim";

export const Route = createFileRoute("/_authenticated/team")({
  component: TeamPage,
});

const empty = { full_name: "", email: "", phone: "", role: "", monthly_salary: "0", joined_at: "", active: true };

function TeamPage() {
  const { role } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [payOpen, setPayOpen] = useState<any>(null);

  const { data: members } = useQuery({
    queryKey: ["team"],
    queryFn: async () => (await db.from("team_members").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  const { data: payments } = useQuery({
    queryKey: ["salary-payments"],
    queryFn: async () => (await db.from("salary_payments").select("*, team_members(full_name)").order("paid_at", { ascending: false })).data ?? [],
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await db.from("team_members").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["team"] }); },
  });

  if (role !== "admin") return <p className="text-sm text-muted-foreground">Admin only.</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Team & Salary</h1><p className="text-sm text-muted-foreground">Employees, contractors, and salary payments.</p></div>
        <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="mr-2 h-4 w-4" />Add member</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Name</TableHead><TableHead>Role</TableHead><TableHead>Contact</TableHead>
              <TableHead>Monthly salary</TableHead><TableHead>Joined</TableHead><TableHead>Status</TableHead><TableHead className="w-32" />
            </TableRow></TableHeader>
            <TableBody>
              {(members ?? []).map((m: any) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium"><Link to="/team/$memberId" params={{ memberId: m.id }} className="text-primary hover:underline">{m.full_name}</Link></TableCell>
                  <TableCell>{m.role ?? "—"}</TableCell>
                  <TableCell className="text-xs">{m.email}<br />{m.phone}</TableCell>
                  <TableCell>{formatBDT(m.monthly_salary)}</TableCell>
                  <TableCell>{formatDate(m.joined_at)}</TableCell>
                  <TableCell><Badge variant={m.active ? "default" : "secondary"}>{m.active ? "active" : "inactive"}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => setPayOpen(m)}><Wallet className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(m); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => { if (confirm("Delete?")) del.mutate(m.id); }}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {(members ?? []).length === 0 && <TableRow><TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">No team members yet.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-semibold mb-3">Recent salary payments</h2>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Member</TableHead><TableHead>Period</TableHead><TableHead>Amount</TableHead><TableHead>Notes</TableHead></TableRow></TableHeader>
              <TableBody>
                {(payments ?? []).map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell>{formatDate(p.paid_at)}</TableCell>
                    <TableCell>{p.team_member_id ? <Link to="/team/$memberId" params={{ memberId: p.team_member_id }} className="text-primary hover:underline">{p.team_members?.full_name}</Link> : p.team_members?.full_name}</TableCell>
                    <TableCell>{p.pay_period}</TableCell>
                    <TableCell className="font-medium">{formatBDT(p.amount)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{p.notes}</TableCell>
                  </TableRow>
                ))}
                {(payments ?? []).length === 0 && <TableRow><TableCell colSpan={5} className="py-6 text-center text-sm text-muted-foreground">No payments recorded.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <MemberDialog open={open} onOpenChange={setOpen} editing={editing} />
      {payOpen && <PayDialog member={payOpen} onClose={() => setPayOpen(null)} />}
    </div>
  );
}

function MemberDialog({ open, onOpenChange, editing }: any) {
  const qc = useQueryClient();
  const [f, setF] = useState<any>(empty);
  useEffect(() => {
    if (open) {
      if (editing) setF({ full_name: editing.full_name, email: editing.email ?? "", phone: editing.phone ?? "", role: editing.role ?? "", monthly_salary: String(editing.monthly_salary ?? "0"), joined_at: editing.joined_at ?? "", active: editing.active });
      else setF(empty);
    }
  }, [open, editing]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...f, monthly_salary: Number(f.monthly_salary) || 0, joined_at: f.joined_at || null };
      if (editing) { const { error } = await db.from("team_members").update(payload).eq("id", editing.id); if (error) throw error; }
      else { const { error } = await db.from("team_members").insert(payload); if (error) throw error; }
    },
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["team"] }); onOpenChange(false); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{editing ? "Edit member" : "Add member"}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div><Label>Full name</Label><Input value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Email</Label><Input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
          </div>
          <div><Label>Role / Position</Label><Input value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} placeholder="Developer, Support, Sales…" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Monthly salary (৳)</Label><Input type="number" value={f.monthly_salary} onChange={(e) => setF({ ...f, monthly_salary: e.target.value })} /></div>
            <div><Label>Joined</Label><Input type="date" value={f.joined_at} onChange={(e) => setF({ ...f, joined_at: e.target.value })} /></div>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={f.active ? "1" : "0"} onValueChange={(v) => setF({ ...f, active: v === "1" })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="1">Active</SelectItem><SelectItem value="0">Inactive</SelectItem></SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter><Button onClick={() => save.mutate()} disabled={!f.full_name || save.isPending}>Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PayDialog({ member, onClose }: any) {
  const qc = useQueryClient();
  const [amount, setAmount] = useState(String(member.monthly_salary));
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [notes, setNotes] = useState("");
  const pay = useMutation({
    mutationFn: async () => {
      const { error } = await db.from("salary_payments").insert({
        team_member_id: member.id, amount: Number(amount), pay_period: period, notes,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Payment recorded"); qc.invalidateQueries({ queryKey: ["salary-payments"] }); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Pay salary — {member.full_name}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div><Label>Amount (৳)</Label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
          <div><Label>Pay period</Label><Input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} /></div>
          <div><Label>Notes</Label><Input value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        </div>
        <DialogFooter><Button onClick={() => pay.mutate()} disabled={pay.isPending}>Record payment</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
