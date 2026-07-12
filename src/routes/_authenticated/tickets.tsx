import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { db } from "@/lib/db-shim";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";
import { createSupportTicket } from "@/lib/support.functions";
import { Loader2, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/tickets")({
  component: SupportListPage,
});

const statusColor: Record<string, string> = {
  open: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  pending: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  resolved: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  closed: "bg-muted text-muted-foreground",
};

function SupportListPage() {
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: tickets, isLoading } = useQuery({
    queryKey: ["support-tickets", statusFilter],
    queryFn: async () => {
      let q = db.from("support_tickets")
        .select("id, subject, status, priority, last_reply_at, created_at, customer_id, profiles!support_tickets_customer_id_fkey(full_name, email)")
        .order("last_reply_at", { ascending: false });
      if (statusFilter !== "all") q = q.eq("status", statusFilter as any);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Support</h1>
          <p className="text-sm text-muted-foreground">
            {isAdmin ? "All customer tickets" : "Your support tickets"}
          </p>
        </div>
        <NewTicketDialog />
      </div>

      <div className="flex gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                {isAdmin && <TableHead>Customer</TableHead>}
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last reply</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={isAdmin ? 5 : 4} className="text-center text-sm text-muted-foreground py-8">Loading…</TableCell></TableRow>
              ) : (tickets ?? []).length === 0 ? (
                <TableRow><TableCell colSpan={isAdmin ? 5 : 4} className="text-center text-sm text-muted-foreground py-8">No tickets yet.</TableCell></TableRow>
              ) : (
                (tickets ?? []).map((t: any) => (
                  <TableRow key={t.id} className="cursor-pointer" onClick={() => (window.location.href = `/tickets/${t.id}`)}>
                    <TableCell className="font-medium">
                      <Link to="/tickets/$ticketId" params={{ ticketId: t.id }} className="hover:underline">{t.subject}</Link>
                    </TableCell>
                    {isAdmin && <TableCell className="text-sm">{t.profiles?.full_name ?? t.profiles?.email ?? "—"}</TableCell>}
                    <TableCell><Badge variant="outline" className="capitalize">{t.priority}</Badge></TableCell>
                    <TableCell><Badge className={`capitalize ${statusColor[t.status] ?? ""}`} variant="secondary">{t.status}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(t.last_reply_at)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function NewTicketDialog() {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState("normal");
  const navigate = useNavigate();
  const qc = useQueryClient();
  const create = useServerFn(createSupportTicket);

  const m = useMutation({
    mutationFn: () => create({ data: { subject, body, priority } }),
    onSuccess: (r) => {
      toast.success("Ticket created");
      qc.invalidateQueries({ queryKey: ["support-tickets"] });
      setOpen(false);
      setSubject(""); setBody(""); setPriority("normal");
      navigate({ to: "/tickets/$ticketId", params: { ticketId: r.ticket_id } });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4 mr-1" />New ticket</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New support ticket</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} placeholder="Brief summary" />
          </div>
          <div>
            <Label>Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Message</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} maxLength={5000} placeholder="Describe your issue…" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button disabled={m.isPending || !subject.trim() || !body.trim()} onClick={() => m.mutate()}>
            {m.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
