import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, ArrowLeft, CheckCircle2, Copy, History, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { db } from "@/lib/db-shim";
import { useAuth } from "@/lib/auth";
import { formatBDT, formatDate } from "@/lib/format";
import { activateHostingOrder, updateOrderDomain } from "@/lib/orders.functions";
import { validateDomain } from "@/lib/domain-validate";

export const Route = createFileRoute("/_authenticated/orders_/$orderId")({
  component: OrderDetailsPage,
});

const STATUSES = ["pending", "processing", "completed", "cancelled", "rejected"] as const;

function OrderDetailsPage() {
  const { orderId } = Route.useParams();
  const { role } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [notes, setNotes] = useState<string>("");
  const [domainEdit, setDomainEdit] = useState<string>("");
  const [editingDomain, setEditingDomain] = useState(false);
  const [whmServerId, setWhmServerId] = useState<string>("");
  const [activateOpen, setActivateOpen] = useState(false);
  const [confirmActivate, setConfirmActivate] = useState(false);
  const [creds, setCreds] = useState<{ cpanel_username: string; cpanel_password: string; whm_created: boolean; whm_error: string | null } | null>(null);

  const { data: order, isLoading, error: orderError } = useQuery({
    queryKey: ["customer_order", orderId],
    queryFn: async () => {
      const { data, error } = await db.from("customer_orders")
        .select("*, hosting_packages(name, price, billing_cycle), service_catalog(name, price), profiles!customer_orders_customer_id_fkey(id, full_name, email, phone, company)")
        .eq("id", orderId).maybeSingle();
      if (error) throw error;
      if (!data) return null;
      if ((data as any).admin_notes !== undefined) setNotes((data as any).admin_notes ?? "");
      const activatedId = (data as any).activated_service_id;
      let svc: any = null;
      if (activatedId) {
        const { data: s } = await db.from("services")
          .select("id, name, cpanel_username, cpanel_password, whm_server_id, status, expiry_date")
          .eq("id", activatedId).maybeSingle();
        svc = s ?? null;
      }
      return { ...(data as any), services: svc };
    },
  });


  const serviceId = (order as any)?.activated_service_id as string | undefined;

  const { data: invoices } = useQuery({
    queryKey: ["order_invoices", serviceId],
    enabled: !!serviceId,
    queryFn: async () => {
      const { data: items } = await db.from("invoice_items").select("invoice_id").eq("service_id", serviceId);
      const ids = Array.from(new Set((items ?? []).map((i: any) => i.invoice_id).filter(Boolean)));
      if (!ids.length) return [];
      const { data: invs } = await db.from("invoices")
        .select("id, invoice_number, status, issue_date, due_date, total, amount_paid").in("id", ids)
        .order("issue_date", { ascending: false });
      return invs ?? [];
    },
  });

  const invoiceIds = (invoices ?? []).map((i: any) => i.id);
  const { data: payments } = useQuery({
    queryKey: ["order_payments", invoiceIds],
    enabled: invoiceIds.length > 0,
    queryFn: async () => (await db.from("payments").select("*").in("invoice_id", invoiceIds).order("payment_date", { ascending: false })).data ?? [],
  });

  const { data: whmServers } = useQuery({
    queryKey: ["whm_servers"],
    enabled: role === "admin",
    queryFn: async () => (await db.from("whm_servers").select("id, name").order("name")).data ?? [],
  });

  const saveMeta = useMutation({
    mutationFn: async (patch: { admin_notes?: string; status?: string; domain_name?: string }) => {
      const { error } = await db.from("customer_orders").update(patch as any).eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["customer_order", orderId] }); qc.invalidateQueries({ queryKey: ["customer_orders"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const domainMut = useMutation({
    mutationFn: async (domain_name: string) => updateOrderDomain({ data: { order_id: orderId, domain_name } }),
    onSuccess: (r: any) => {
      toast.success(r.changed ? "Domain updated & logged" : "No change");
      setEditingDomain(false);
      qc.invalidateQueries({ queryKey: ["customer_order", orderId] });
      qc.invalidateQueries({ queryKey: ["customer_orders"] });
      qc.invalidateQueries({ queryKey: ["order_domain_changes", orderId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const { data: domainHistory } = useQuery({
    queryKey: ["order_domain_changes", orderId],
    queryFn: async () => {
      const { data } = await db.from("order_domain_changes")
        .select("id, old_domain, new_domain, actor_id, created_at")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false });
      const rows = (data ?? []) as any[];
      const actorIds = Array.from(new Set(rows.map((r) => r.actor_id).filter(Boolean)));
      if (actorIds.length) {
        const { data: profs } = await db.from("profiles").select("id, full_name, email").in("id", actorIds);
        const map = new Map((profs ?? []).map((p: any) => [p.id, p]));
        return rows.map((r) => ({ ...r, actor: map.get(r.actor_id) ?? null }));
      }
      return rows.map((r) => ({ ...r, actor: null }));
    },
  });

  const activateMut = useMutation({
    mutationFn: async () => activateHostingOrder({ data: { order_id: orderId, whm_server_id: whmServerId || null } }),
    onSuccess: (r: any) => {
      setCreds({ cpanel_username: r.cpanel_username, cpanel_password: r.cpanel_password, whm_created: r.whm_created, whm_error: r.whm_error });
      toast.success(r.whm_created ? "Activated & cPanel created" : "Activated");
      qc.invalidateQueries({ queryKey: ["customer_order", orderId] });
      qc.invalidateQueries({ queryKey: ["customer_orders"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (role !== "admin") return <p className="text-sm text-muted-foreground">Admin only.</p>;
  if (isLoading) return <div className="p-6 text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Loading…</div>;
  if (orderError) return <p className="text-sm text-destructive">Failed to load: {(orderError as any).message} <Link to="/orders" className="underline">Back</Link></p>;
  if (!order) return <p className="text-sm">Order not found. <Link to="/orders" className="underline">Back</Link></p>;


  const o: any = order;
  const svc = o.services;
  const canActivate = o.order_type === "hosting" && o.status !== "completed";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" size="sm" onClick={() => nav({ to: "/orders" })}><ArrowLeft className="mr-1 h-3 w-3" />Back to orders</Button>
          <h1 className="text-2xl font-bold mt-2">Order details</h1>
          <p className="text-xs text-muted-foreground font-mono">{o.id}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="capitalize">{o.status}</Badge>
          {canActivate && (
            <Button
              onClick={() => { setActivateOpen(true); setCreds(null); setWhmServerId(""); setConfirmActivate(false); }}
              disabled={!validateDomain(o.domain_name ?? "").ok}
              title={!validateDomain(o.domain_name ?? "").ok ? "একটি বৈধ ডোমেইন যোগ করুন" : ""}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />Verify &amp; Activate
            </Button>
          )}
        </div>
      </div>

      {canActivate && !validateDomain(o.domain_name ?? "").ok && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Activation blocked — invalid domain</AlertTitle>
          <AlertDescription>
            {(validateDomain(o.domain_name ?? "") as { ok: false; error: string }).error}
            {" "}উপরের "Domain" ঘরে সঠিক ডোমেইন সেভ করলে Activate বাটন সক্রিয় হবে।
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Order</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Type"><Badge variant="outline" className="capitalize">{o.order_type}</Badge></Row>
            <Row label="Item">{o.hosting_packages?.name ?? o.service_catalog?.name ?? o.domain_name ?? "—"}</Row>
            <Row label="Quoted price"><span className="font-medium">{formatBDT(o.quoted_price)}</span></Row>
            {o.billing_cycle && <Row label="Billing">{o.billing_cycle}</Row>}
            <div className="border-t pt-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">Domain {o.order_type === "hosting" && <span className="text-destructive">*</span>}</span>
                {!editingDomain && (
                  <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => { setDomainEdit(o.domain_name ?? ""); setEditingDomain(true); }}>
                    {o.domain_name ? "Edit" : "Add"}
                  </Button>
                )}
              </div>
              {editingDomain ? (
                <div className="space-y-1">
                  <div className="flex gap-2">
                    <Input value={domainEdit} onChange={(e) => setDomainEdit(e.target.value)} placeholder="example.com" className="h-8" aria-invalid={domainEdit.length > 0 && !validateDomain(domainEdit).ok} />
                    <Button size="sm" onClick={() => {
                      const v = validateDomain(domainEdit);
                      if (!v.ok) { toast.error(v.error); return; }
                      if (o.domain_name && v.value !== String(o.domain_name).toLowerCase()) {
                        if (!confirm(`ডোমেইন পরিবর্তন করবেন?\n\nপুরাতন: ${o.domain_name}\nনতুন: ${v.value}\n\nএই পরিবর্তন অডিট লগে যাবে।`)) return;
                      }
                      domainMut.mutate(v.value);
                    }} disabled={domainMut.isPending || !validateDomain(domainEdit).ok}>Save</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingDomain(false)}>Cancel</Button>
                  </div>
                  {domainEdit.length > 0 && !validateDomain(domainEdit).ok && (
                    <p className="text-xs text-destructive">{(validateDomain(domainEdit) as { ok: false; error: string }).error}</p>
                  )}
                </div>
              ) : (
                <div className="text-sm">{o.domain_name || <span className="text-destructive italic">Missing — required for activation</span>} {o.domain_action && <span className="text-xs text-muted-foreground capitalize">({o.domain_action.replace("_", " ")})</span>}</div>
              )}
            </div>
            <Row label="Created">{formatDate(o.created_at)}</Row>
            {o.customer_notes && <div className="pt-2 border-t"><div className="text-xs text-muted-foreground">Customer notes</div><div className="italic">"{o.customer_notes}"</div></div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Customer</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Name">
              {o.profiles?.id
                ? <Link to="/customers/$customerId" params={{ customerId: o.profiles.id }} className="underline">{o.profiles.full_name ?? o.profiles.email}</Link>
                : (o.profiles?.full_name ?? o.profiles?.email ?? "—")}
            </Row>
            {o.profiles?.email && <Row label="Email">{o.profiles.email}</Row>}
            {o.profiles?.phone && <Row label="Phone">{o.profiles.phone}</Row>}
            {o.profiles?.company && <Row label="Company">{o.profiles.company}</Row>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Payment (customer-reported)</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {o.payment_method
              ? <>
                  <Row label="Method"><span className="capitalize">{o.payment_method.replace("_", " ")}</span></Row>
                  {o.manual_trx_id && <Row label="TRX ID"><span className="font-mono">{o.manual_trx_id}</span></Row>}
                  {o.manual_sender && <Row label="Sender">{o.manual_sender}</Row>}
                </>
              : <div className="text-muted-foreground">No payment info submitted.</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Admin</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={o.status} onValueChange={(v) => saveMeta.mutate({ status: v })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Admin notes</Label>
              <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
              <Button size="sm" variant="outline" className="mt-2" onClick={() => saveMeta.mutate({ admin_notes: notes })} disabled={saveMeta.isPending}>Save notes</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Activated service</CardTitle></CardHeader>
        <CardContent className="text-sm">
          {svc ? (
            <div className="space-y-2">
              <Row label="Service">
                <Link to="/services/$serviceId" params={{ serviceId: svc.id }} className="underline">{svc.name}</Link>
                <Badge variant="outline" className="ml-2 capitalize">{svc.status}</Badge>
              </Row>
              {svc.expiry_date && <Row label="Expires">{formatDate(svc.expiry_date)}</Row>}
              {svc.cpanel_username && <Row label="cPanel user"><span className="font-mono">{svc.cpanel_username}</span></Row>}
              {svc.cpanel_password && <Row label="cPanel pass"><CopyField value={svc.cpanel_password} /></Row>}
            </div>
          ) : <div className="text-muted-foreground">Not activated yet.</div>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Invoices &amp; payments</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-3">
          {(invoices ?? []).length === 0 && <div className="text-muted-foreground">No invoice linked yet. Activate the order to generate one, or link an invoice item to this service.</div>}
          {(invoices ?? []).map((inv: any) => {
            const paid = Number(inv.amount_paid ?? 0);
            const outstanding = Number(inv.total) - paid;
            const invPayments = (payments ?? []).filter((p: any) => p.invoice_id === inv.id);
            return (
              <div key={inv.id} className="rounded-md border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <Link to="/invoices/$invoiceId" params={{ invoiceId: inv.id }} className="font-mono text-xs underline">{inv.invoice_number}</Link>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize">{inv.status}</Badge>
                    <span className="font-medium">{formatBDT(inv.total)}</span>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">Issued {formatDate(inv.issue_date)} · Paid {formatBDT(paid)} · Outstanding {formatBDT(outstanding)}</div>
                {invPayments.length > 0 && (
                  <div className="pt-2 border-t space-y-1">
                    {invPayments.map((p: any) => (
                      <div key={p.id} className="flex items-center justify-between text-xs">
                        <span>{formatDate(p.payment_date)} · <span className="capitalize">{(p.method ?? "").replace("_", " ")}</span>{p.reference && <> · <span className="font-mono">{p.reference}</span></>}</span>
                        <span className="font-medium">{formatBDT(p.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Dialog open={activateOpen} onOpenChange={(v) => { if (!v) { setActivateOpen(false); setCreds(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{creds ? "Order activated" : "Verify & Activate"}</DialogTitle>
            <DialogDescription>
              {creds
                ? "Share these credentials with the customer. They will also see this service in their portal."
                : `Confirm payment for ${o.hosting_packages?.name ?? o.domain_name} (${formatBDT(o.quoted_price)}). This creates the hosting service and optionally a cPanel account.`}
            </DialogDescription>
          </DialogHeader>

          {!creds && (
            <div className="space-y-3">
              {o.manual_trx_id && (
                <div className="rounded-md bg-muted p-3 text-sm">
                  <div><span className="text-muted-foreground">TRX:</span> <span className="font-mono">{o.manual_trx_id}</span></div>
                  {o.manual_sender && <div><span className="text-muted-foreground">Sender:</span> {o.manual_sender}</div>}
                </div>
              )}
              <div>
                <Label>WHM Server (optional)</Label>
                <Select value={whmServerId} onValueChange={setWhmServerId}>
                  <SelectTrigger><SelectValue placeholder="Skip WHM (create service only)" /></SelectTrigger>
                  <SelectContent>{(whmServers ?? []).map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          )}

          {creds && (
            <div className="space-y-2 text-sm">
              <CredRow label="cPanel Username" value={creds.cpanel_username} />
              <CredRow label="cPanel Password" value={creds.cpanel_password} />
              {creds.whm_created && <p className="text-xs text-emerald-600">✓ cPanel account created on WHM.</p>}
              {creds.whm_error && <p className="text-xs text-amber-600">WHM error: {creds.whm_error}</p>}
            </div>
          )}

          <DialogFooter>
            {!creds ? (
              <>
                <Button variant="outline" onClick={() => setActivateOpen(false)}>Cancel</Button>
                <Button onClick={() => activateMut.mutate()} disabled={activateMut.isPending}>
                  {activateMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Activate
                </Button>
              </>
            ) : (
              <Button onClick={() => { setActivateOpen(false); setCreds(null); }}>Done</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  );
}

function CopyField({ value }: { value: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="font-mono">{value}</span>
      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { navigator.clipboard.writeText(value); toast.success("Copied"); }}>
        <Copy className="h-3 w-3" />
      </Button>
    </span>
  );
}

function CredRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded border p-2">
      <div><div className="text-xs text-muted-foreground">{label}</div><div className="font-mono">{value}</div></div>
      <Button size="icon" variant="ghost" onClick={() => { navigator.clipboard.writeText(value); toast.success("Copied"); }}><Copy className="h-3 w-3" /></Button>
    </div>
  );
}
