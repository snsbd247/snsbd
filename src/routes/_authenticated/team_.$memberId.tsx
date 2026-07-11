import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, Save, Trash2, Wallet, User } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { formatBDT, formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/team/$memberId")({
  component: TeamMemberDetail,
});

function TeamMemberDetail() {
  const { memberId } = Route.useParams();
  const { role } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: member, isLoading } = useQuery({
    queryKey: ["team-member", memberId],
    queryFn: async () => {
      const { data, error } = await supabase.from("team_members").select("*").eq("id", memberId).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: payments } = useQuery({
    queryKey: ["team-member-payments", memberId],
    queryFn: async () => (await supabase.from("salary_payments").select("*").eq("team_member_id", memberId).order("paid_at", { ascending: false })).data ?? [],
  });

  const [f, setF] = useState<any>(null);
  useEffect(() => {
    if (member) setF({
      full_name: member.full_name, email: member.email ?? "", phone: member.phone ?? "",
      role: member.role ?? "", monthly_salary: String(member.monthly_salary ?? "0"),
      joined_at: member.joined_at ?? "", active: member.active,
    });
  }, [member]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...f, monthly_salary: Number(f.monthly_salary) || 0, joined_at: f.joined_at || null };
      const { error } = await supabase.from("team_members").update(payload).eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["team-member", memberId] }); qc.invalidateQueries({ queryKey: ["team"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async () => { const { error } = await supabase.from("team_members").delete().eq("id", memberId); if (error) throw error; },
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["team"] }); navigate({ to: "/team" }); },
  });

  const [payAmt, setPayAmt] = useState("");
  const [payPeriod, setPayPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [payNotes, setPayNotes] = useState("");
  const recordPay = useMutation({
    mutationFn: async () => {
      const amt = Number(payAmt);
      if (!amt) throw new Error("Enter amount");
      const { error } = await supabase.from("salary_payments").insert({ team_member_id: memberId, amount: amt, pay_period: payPeriod, notes: payNotes });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Payment recorded"); setPayAmt(""); setPayNotes(""); qc.invalidateQueries({ queryKey: ["team-member-payments", memberId] }); qc.invalidateQueries({ queryKey: ["salary-payments"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (role !== "admin") return <p className="text-sm text-muted-foreground">Admin only.</p>;
  if (isLoading || !f) return <div className="flex items-center gap-2 text-sm text-muted-foreground p-6"><Loader2 className="h-4 w-4 animate-spin" />Loading…</div>;
  if (!member) return <div className="space-y-4"><div className="text-sm text-muted-foreground">Member not found.</div><Button variant="outline" onClick={() => navigate({ to: "/team" })}><ArrowLeft className="mr-2 h-4 w-4" />Back</Button></div>;

  const totalPaid = (payments ?? []).reduce((s: number, p: any) => s + Number(p.amount), 0);

  return (
    <div className="space-y-6 max-w-4xl">
      <nav className="text-xs text-muted-foreground flex items-center gap-1.5">
        <Link to="/" className="hover:text-foreground">Home</Link><span>/</span>
        <Link to="/team" className="hover:text-foreground">Team</Link><span>/</span>
        <span className="text-foreground font-medium">{member.full_name}</span>
      </nav>
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => navigate({ to: "/team" })}><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
        <Button variant="destructive" onClick={() => { if (confirm("Delete member?")) del.mutate(); }}><Trash2 className="mr-2 h-4 w-4" />Delete</Button>
      </div>

      <div className="flex items-center gap-3">
        <User className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">{member.full_name}</h1>
        <Badge variant={member.active ? "default" : "secondary"}>{member.active ? "active" : "inactive"}</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Monthly salary</div><div className="text-sm font-medium mt-1">{formatBDT(member.monthly_salary)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Total paid</div><div className="text-sm font-medium mt-1">{formatBDT(totalPaid)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Joined</div><div className="text-sm font-medium mt-1">{formatDate(member.joined_at)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Payments</div><div className="text-sm font-medium mt-1">{(payments ?? []).length}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Profile</CardTitle></CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Full name</Label><Input value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} /></div>
            <div><Label>Role</Label><Input value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Email</Label><Input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Monthly salary (৳)</Label><Input type="number" value={f.monthly_salary} onChange={(e) => setF({ ...f, monthly_salary: e.target.value })} /></div>
            <div><Label>Joined</Label><Input type="date" value={f.joined_at} onChange={(e) => setF({ ...f, joined_at: e.target.value })} /></div>
            <div>
              <Label>Status</Label>
              <Select value={f.active ? "1" : "0"} onValueChange={(v) => setF({ ...f, active: v === "1" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="1">Active</SelectItem><SelectItem value="0">Inactive</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end"><Button onClick={() => save.mutate()} disabled={save.isPending}><Save className="mr-2 h-4 w-4" />Save</Button></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Wallet className="h-4 w-4" />Record salary payment</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <div><Label>Amount (৳)</Label><Input type="number" value={payAmt} onChange={(e) => setPayAmt(e.target.value)} placeholder={String(member.monthly_salary)} /></div>
          <div><Label>Period</Label><Input type="month" value={payPeriod} onChange={(e) => setPayPeriod(e.target.value)} /></div>
          <div className="md:col-span-2"><Label>Notes</Label><Input value={payNotes} onChange={(e) => setPayNotes(e.target.value)} /></div>
          <div className="md:col-span-4 flex justify-end"><Button onClick={() => recordPay.mutate()} disabled={recordPay.isPending}>Record</Button></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Salary history</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Paid at</TableHead><TableHead>Period</TableHead><TableHead>Amount</TableHead><TableHead>Notes</TableHead></TableRow></TableHeader>
            <TableBody>
              {(payments ?? []).map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell>{formatDate(p.paid_at)}</TableCell>
                  <TableCell>{p.pay_period}</TableCell>
                  <TableCell className="font-medium">{formatBDT(p.amount)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{p.notes}</TableCell>
                </TableRow>
              ))}
              {(payments ?? []).length === 0 && <TableRow><TableCell colSpan={4} className="py-6 text-center text-sm text-muted-foreground">No payments yet.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
