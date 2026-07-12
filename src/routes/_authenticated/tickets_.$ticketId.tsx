import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useMemo } from "react";
import { db } from "@/lib/db-shim";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";
import { replySupportTicket, updateSupportTicket } from "@/lib/support.functions";
import { ArrowLeft, Loader2, Lock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/tickets_/$ticketId")({
  component: TicketDetail,
});

function TicketDetail() {
  const { ticketId } = Route.useParams();
  const { role, user } = useAuth();
  const isAdmin = role === "admin";
  const qc = useQueryClient();
  const navigate = useNavigate();
  const reply = useServerFn(replySupportTicket);
  const update = useServerFn(updateSupportTicket);

  const { data: ticket, isLoading } = useQuery({
    queryKey: ["ticket", ticketId],
    queryFn: async () => {
      const { data, error } = await db.from("support_tickets")
        .select("*, profiles!support_tickets_customer_id_fkey(full_name, email)")
        .eq("id", ticketId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: messages } = useQuery({
    queryKey: ["ticket-messages", ticketId],
    queryFn: async () => {
      const { data, error } = await db.from("support_messages")
        .select("*, profiles!support_messages_sender_id_fkey(full_name, email)")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 15000,
  });

  const [body, setBody] = useState("");
  const [internal, setInternal] = useState(false);

  const replyM = useMutation({
    mutationFn: () => reply({ data: { ticket_id: ticketId, body, is_internal: internal } }),
    onSuccess: () => {
      setBody(""); setInternal(false);
      qc.invalidateQueries({ queryKey: ["ticket-messages", ticketId] });
      qc.invalidateQueries({ queryKey: ["ticket", ticketId] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const statusM = useMutation({
    mutationFn: (status: string) => update({ data: { ticket_id: ticketId, status } }),
    onSuccess: () => {
      toast.success("Updated");
      qc.invalidateQueries({ queryKey: ["ticket", ticketId] });
      qc.invalidateQueries({ queryKey: ["support-tickets"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const priorityM = useMutation({
    mutationFn: (priority: string) => update({ data: { ticket_id: ticketId, priority } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ticket", ticketId] }),
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const canClose = useMemo(() => ticket && (isAdmin || ticket.customer_id === user?.id), [ticket, isAdmin, user]);

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  if (!ticket) return <div className="p-6 text-sm text-muted-foreground">Ticket not found.</div>;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <button onClick={() => navigate({ to: "/tickets" })} className="text-sm text-muted-foreground inline-flex items-center gap-1 hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />Back to tickets
      </button>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="min-w-0">
            <CardTitle className="text-xl">{ticket.subject}</CardTitle>
            <div className="text-xs text-muted-foreground mt-1">
              Opened by {(ticket as any).profiles?.full_name ?? (ticket as any).profiles?.email ?? "—"} · {formatDate(ticket.created_at)}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="outline" className="capitalize">{ticket.priority}</Badge>
            <Badge variant="secondary" className="capitalize">{ticket.status}</Badge>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {canClose && ticket.status !== "closed" && (
            <Button size="sm" variant="outline" onClick={() => statusM.mutate("closed")}>Close ticket</Button>
          )}
          {canClose && ticket.status !== "resolved" && ticket.status !== "closed" && (
            <Button size="sm" variant="outline" onClick={() => statusM.mutate("resolved")}>Mark resolved</Button>
          )}
          {canClose && (ticket.status === "resolved" || ticket.status === "closed") && (
            <Button size="sm" variant="outline" onClick={() => statusM.mutate("open")}>Reopen</Button>
          )}
          {isAdmin && (
            <Select value={ticket.priority} onValueChange={(v) => priorityM.mutate(v)}>
              <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      <div className="space-y-3">
        {(messages ?? []).map((m: any) => {
          const mine = m.sender_id === user?.id;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                m.is_internal
                  ? "bg-amber-500/10 border border-amber-500/30"
                  : mine ? "bg-primary text-primary-foreground" : "bg-muted"
              }`}>
                <div className="flex items-center gap-2 text-xs opacity-80 mb-1">
                  {m.is_internal && <Lock className="h-3 w-3" />}
                  <span>{m.profiles?.full_name ?? m.profiles?.email ?? "—"}</span>
                  <span>·</span>
                  <span>{formatDate(m.created_at)}</span>
                </div>
                <div className="whitespace-pre-wrap break-words">{m.body}</div>
              </div>
            </div>
          );
        })}
      </div>

      {ticket.status !== "closed" && (
        <Card>
          <CardContent className="pt-4 space-y-2">
            <Label>Reply</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} maxLength={5000} placeholder="Type your reply…" />
            <div className="flex items-center justify-between">
              {isAdmin ? (
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={internal} onCheckedChange={(v) => setInternal(!!v)} />
                  Internal note (hidden from customer)
                </label>
              ) : <span />}
              <Button disabled={replyM.isPending || !body.trim()} onClick={() => replyM.mutate()}>
                {replyM.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Send reply
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
