import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { getPortalClient } from "@/integrations/supabase/portal-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, LogOut, Search, ShoppingCart, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { formatBDT, formatDate } from "@/lib/format";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/client")({
  ssr: false,
  component: PortalPage,
});

const TLD_PRICES: Record<string, number> = {
  ".com": 1200, ".net": 1400, ".org": 1400, ".info": 1000, ".xyz": 800,
  ".com.bd": 1800, ".net.bd": 1800, ".org.bd": 1800, ".io": 4500, ".dev": 2200,
};

function PortalPage() {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [err, setErr] = useState<string>("");
  const [profile, setProfile] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [uid, setUid] = useState<string>("");

  const load = async () => {
    const client = getPortalClient();
    const { data: userData } = await client.auth.getUser();
    if (!userData.user) throw new Error("No portal session.");
    const id = userData.user.id;
    setUid(id);
    const [p, pr, sv, inv, hp, sc, ord] = await Promise.all([
      client.from("profiles").select("*").eq("id", id).maybeSingle(),
      client.from("projects").select("*").eq("customer_id", id).order("created_at", { ascending: false }),
      client.from("services").select("*").eq("customer_id", id).order("created_at", { ascending: false }),
      client.from("invoices").select("id, invoice_number, status, issue_date, total, amount_paid")
        .eq("customer_id", id).order("issue_date", { ascending: false }),
      client.from("hosting_packages").select("*").eq("is_active", true).order("sort_order").order("price"),
      client.from("service_catalog").select("*").eq("is_active", true).order("sort_order").order("name"),
      client.from("customer_orders").select("*, hosting_packages(name), service_catalog(name), services!customer_orders_activated_service_id_fkey(id, name, cpanel_username, cpanel_password, status, expiry_date)")
        .eq("customer_id", id).order("created_at", { ascending: false }),
    ]);
    setProfile(p.data);
    setProjects(pr.data ?? []);
    setServices(sv.data ?? []);
    setInvoices(inv.data ?? []);
    setPackages(hp.data ?? []);
    setCatalog(sc.data ?? []);
    setOrders(ord.data ?? []);
    const projIds = (pr.data ?? []).map((x: any) => x.id);
    if (projIds.length) {
      const { data: ms } = await client.from("project_milestones").select("*").in("project_id", projIds).order("sort_order");
      setMilestones(ms ?? []);
    }
  };

  useEffect(() => {
    (async () => {
      const client = getPortalClient();
      try {
        const hash = window.location.hash.replace(/^#/, "");
        const params = new URLSearchParams(hash);
        const at = params.get("at");
        const rt = params.get("rt");
        if (at && rt) {
          const { error } = await client.auth.setSession({ access_token: at, refresh_token: rt });
          if (error) throw error;
          window.history.replaceState({}, "", window.location.pathname);
        }
        await load();
        setStatus("ready");
      } catch (e: any) {
        setErr(e?.message ?? "Failed to load portal");
        setStatus("error");
      }
    })();
  }, []);

  const signOut = async () => { await getPortalClient().auth.signOut(); window.location.href = "/"; };

  if (status === "loading") {
    return <div className="p-8 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Signing you in…</div>;
  }
  if (status === "error") return <div className="p-8 text-sm text-destructive">{err}</div>;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex-1 p-6 space-y-6 max-w-6xl w-full mx-auto">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs text-muted-foreground">Customer portal</div>
            <h1 className="text-2xl font-bold">{profile?.full_name ?? profile?.email}</h1>
            {profile?.company && <div className="text-sm text-muted-foreground">{profile.company}</div>}
          </div>
          <Button variant="outline" size="sm" onClick={signOut}><LogOut className="mr-2 h-4 w-4" />Sign out</Button>
        </div>

        <Tabs defaultValue="dashboard">
          <TabsList className="flex-wrap">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="domain">Order domain</TabsTrigger>
            <TabsTrigger value="hosting">Order hosting</TabsTrigger>
            <TabsTrigger value="service">Order service</TabsTrigger>
            <TabsTrigger value="orders">My orders</TabsTrigger>
            <TabsTrigger value="invoices">Invoices</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card><CardHeader><CardTitle className="text-sm">Services</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{services.length}</CardContent></Card>
              <Card><CardHeader><CardTitle className="text-sm">Projects</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{projects.length}</CardContent></Card>
              <Card><CardHeader><CardTitle className="text-sm">Pending orders</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{orders.filter((o) => o.status === "pending").length}</CardContent></Card>
            </div>
            <Card>
              <CardHeader><CardTitle className="text-base">My services</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {services.length === 0 && <div className="text-muted-foreground">No services yet.</div>}
                {services.map((s) => (
                  <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 border-b py-2">
                    <div>
                      <div className="font-medium">{s.name}</div>
                      <div className="text-xs text-muted-foreground">{s.type} · expires {formatDate(s.expiry_date)}</div>
                    </div>
                    {s.type === "hosting" && s.whm_server_id && <CpanelActions service={s} />}
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="projects" className="space-y-4">
            {projects.length === 0 && <Card><CardContent className="p-6 text-sm text-muted-foreground">No projects yet.</CardContent></Card>}
            {projects.map((p) => {
              const ms = milestones.filter((m) => m.project_id === p.id);
              const done = ms.filter((m) => m.completed).length;
              return (
                <Card key={p.id}>
                  <CardHeader className="flex-row items-start justify-between space-y-0">
                    <div>
                      <CardTitle className="text-base">{p.name}</CardTitle>
                      {p.description && <p className="text-xs text-muted-foreground mt-1">{p.description}</p>}
                    </div>
                    <Badge variant="outline" className="capitalize">{p.status}</Badge>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="text-xs text-muted-foreground">Milestones {done}/{ms.length}</div>
                    {ms.map((m) => (
                      <div key={m.id} className="flex items-center gap-2 border-b py-2">
                        <div className={"h-4 w-4 rounded-full border " + (m.completed ? "bg-primary border-primary" : "")}>
                          {m.completed && <Check className="h-3 w-3 text-primary-foreground" />}
                        </div>
                        <span className={m.completed ? "line-through text-muted-foreground" : ""}>{m.title}</span>
                        {m.due_date && <span className="ml-auto text-xs text-muted-foreground">{formatDate(m.due_date)}</span>}
                      </div>
                    ))}
                    {ms.length === 0 && <div className="text-xs text-muted-foreground">No milestones.</div>}
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="domain"><DomainOrder uid={uid} onSubmitted={load} /></TabsContent>
          <TabsContent value="hosting"><HostingOrder uid={uid} packages={packages} onSubmitted={load} /></TabsContent>
          <TabsContent value="service"><ServiceOrder uid={uid} catalog={catalog} onSubmitted={load} /></TabsContent>

          <TabsContent value="orders" className="space-y-2">
            {orders.length === 0 && <Card><CardContent className="p-6 text-sm text-muted-foreground">No orders yet.</CardContent></Card>}
            {orders.map((o) => {
              const svc = o.services;
              return (
                <Card key={o.id}><CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium capitalize">
                        {o.order_type} — {o.hosting_packages?.name ?? o.service_catalog?.name ?? o.domain_name ?? "—"}
                      </div>
                      <div className="text-xs text-muted-foreground">{formatDate(o.created_at)} · {formatBDT(o.quoted_price)}</div>
                    </div>
                    <Badge variant="outline" className="capitalize">{o.status}</Badge>
                  </div>
                  {(o.payment_method || o.manual_trx_id) && (
                    <div className="text-xs text-muted-foreground border-t pt-2">
                      {o.payment_method && <span className="capitalize">{o.payment_method.replace("_", " ")}</span>}
                      {o.manual_trx_id && <> · TRX <span className="font-mono">{o.manual_trx_id}</span></>}
                    </div>
                  )}
                  {o.status === "completed" && svc && (
                    <div className="rounded-md bg-muted/60 p-2 text-xs space-y-1">
                      <div className="font-medium text-foreground">Activated — {svc.name}</div>
                      {svc.cpanel_username && <div>cPanel user: <span className="font-mono">{svc.cpanel_username}</span></div>}
                      {svc.cpanel_password && <div>cPanel pass: <span className="font-mono">{svc.cpanel_password}</span></div>}
                      {svc.expiry_date && <div className="text-muted-foreground">Expires {formatDate(svc.expiry_date)}</div>}
                    </div>
                  )}
                  {o.admin_notes && <div className="text-xs italic text-muted-foreground">Note: {o.admin_notes}</div>}
                </CardContent></Card>
              );
            })}
          </TabsContent>

          <TabsContent value="invoices" className="space-y-2">
            {invoices.length === 0 && <Card><CardContent className="p-6 text-sm text-muted-foreground">No invoices yet.</CardContent></Card>}
            {invoices.map((i) => {
              const outstanding = Number(i.total) - Number(i.amount_paid);
              return (
                <Card key={i.id}><CardContent className="p-4 flex items-center justify-between gap-3">
                  <div><div className="font-mono text-xs">{i.invoice_number}</div><div className="text-xs text-muted-foreground">{formatDate(i.issue_date)}</div></div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="capitalize">{i.status}</Badge>
                    <span className="font-medium">{formatBDT(i.total)}</span>
                    {outstanding > 0 && i.status !== "paid" && <BkashPayButton invoiceId={i.id} amount={outstanding} />}
                  </div>
                </CardContent></Card>
              );
            })}
          </TabsContent>
        </Tabs>
      </div>
      <SiteFooter />
    </div>
  );
}

function BkashPayButton({ invoiceId, amount }: { invoiceId: string; amount: number }) {
  const [busy, setBusy] = useState(false);
  const pay = async () => {
    setBusy(true);
    try {
      const { bkashCreatePayment } = await import("@/lib/bkash.functions");
      const callback_url = `${window.location.origin}/client/bkash-callback`;
      const res = await bkashCreatePayment({ data: { invoice_id: invoiceId, amount, callback_url } });
      window.location.href = res.bkashURL;
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to start bKash payment");
      setBusy(false);
    }
  };
  return <Button size="sm" onClick={pay} disabled={busy}>{busy ? "Redirecting…" : `Pay ${formatBDT(amount)} with bKash`}</Button>;
}


/* ---------- Domain ---------- */
function DomainOrder({ uid, onSubmitted }: { uid: string; onSubmitted: () => void }) {
  const [query, setQuery] = useState("");
  const [notes, setNotes] = useState("");
  const [action, setAction] = useState<"register" | "transfer" | "renew">("register");
  const [submitting, setSubmitting] = useState(false);

  const base = useMemo(() => query.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0].split(".")[0], [query]);
  const suggestions = useMemo(() => {
    if (!base) return [];
    return Object.entries(TLD_PRICES).map(([tld, price]) => ({ domain: base + tld, price }));
  }, [base]);

  const submit = async (domain: string, price: number) => {
    setSubmitting(true);
    const { error } = await getPortalClient().from("customer_orders").insert({
      customer_id: uid, order_type: "domain", domain_name: domain, domain_action: action,
      quoted_price: price, customer_notes: notes || null,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Order submitted. We'll contact you shortly.");
    setNotes("");
    onSubmitted();
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Check &amp; order a domain</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <div className="flex-1"><Label>Search domain</Label><Input placeholder="yourbrand" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
          <div className="w-40">
            <Label>Action</Label>
            <Select value={action} onValueChange={(v) => setAction(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="register">Register new</SelectItem>
                <SelectItem value="transfer">Transfer in</SelectItem>
                <SelectItem value="renew">Renew</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div><Label>Notes (optional)</Label><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        {suggestions.length === 0 && <div className="text-xs text-muted-foreground">Type a name above to see extensions.</div>}
        <div className="grid gap-2 md:grid-cols-2">
          {suggestions.map((s) => (
            <div key={s.domain} className="flex items-center justify-between border rounded-md p-3">
              <div><div className="font-medium text-sm">{s.domain}</div><div className="text-xs text-muted-foreground">Quote: {formatBDT(s.price)} / yr</div></div>
              <Button size="sm" onClick={() => submit(s.domain, s.price)} disabled={submitting}>
                <ShoppingCart className="mr-2 h-4 w-4" />Order
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------- Hosting ---------- */
function HostingOrder({ uid, packages, onSubmitted }: { uid: string; packages: any[]; onSubmitted: () => void }) {
  const [open, setOpen] = useState<any>(null);
  const [domainOption, setDomainOption] = useState<"new" | "transfer" | "existing">("existing");
  const [domainName, setDomainName] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!open) return;
    if (!domainName.trim()) return toast.error("Enter your domain name");
    setSubmitting(true);
    const { error } = await getPortalClient().from("customer_orders").insert({
      customer_id: uid, order_type: "hosting", hosting_package_id: open.id,
      domain_name: domainName.trim(),
      domain_action: domainOption === "new" ? "register" : domainOption === "transfer" ? "transfer" : "use_existing",
      quoted_price: open.price, customer_notes: notes || null,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Hosting order submitted.");
    setOpen(null); setDomainName(""); setNotes(""); onSubmitted();
  };

  return (
    <>
      {packages.length === 0 && <Card><CardContent className="p-6 text-sm text-muted-foreground">No hosting packages available.</CardContent></Card>}
      <div className="grid gap-4 md:grid-cols-3">
        {packages.map((p) => (
          <Card key={p.id}>
            <CardHeader><CardTitle className="text-base">{p.name}</CardTitle>
              <div className="text-2xl font-bold mt-2">{formatBDT(p.price)}<span className="text-xs text-muted-foreground font-normal"> / {p.billing_cycle}</span></div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {p.description && <p className="text-xs text-muted-foreground">{p.description}</p>}
              <div className="text-xs">Disk: {p.disk_space ?? "—"}</div>
              <div className="text-xs">Bandwidth: {p.bandwidth ?? "—"}</div>
              {Array.isArray(p.features) && p.features.map((f: string, i: number) => (
                <div key={i} className="flex items-center gap-2 text-xs"><Check className="h-3 w-3 text-primary" />{f}</div>
              ))}
              <Button className="w-full mt-3" onClick={() => setOpen(p)}><ShoppingCart className="mr-2 h-4 w-4" />Order this plan</Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Order — {open?.name}</DialogTitle>
            <DialogDescription>{formatBDT(open?.price ?? 0)} / {open?.billing_cycle}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Domain option</Label>
              <Select value={domainOption} onValueChange={(v) => setDomainOption(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="existing">I'll use my existing domain</SelectItem>
                  <SelectItem value="transfer">Transfer my domain here</SelectItem>
                  <SelectItem value="new">Register a new domain</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Domain name</Label><Input placeholder="example.com" value={domainName} onChange={(e) => setDomainName(e.target.value)} /></div>
            <div><Label>Notes (optional)</Label><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
          </div>
          <DialogFooter><Button onClick={submit} disabled={submitting}>Submit order</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ---------- Service ---------- */
function ServiceOrder({ uid, catalog, onSubmitted }: { uid: string; catalog: any[]; onSubmitted: () => void }) {
  const [open, setOpen] = useState<any>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!open) return;
    setSubmitting(true);
    const { error } = await getPortalClient().from("customer_orders").insert({
      customer_id: uid, order_type: "service", service_catalog_id: open.id,
      quoted_price: open.price, customer_notes: notes || null,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Service order submitted.");
    setOpen(null); setNotes(""); onSubmitted();
  };

  return (
    <>
      {catalog.length === 0 && <Card><CardContent className="p-6 text-sm text-muted-foreground">No services available.</CardContent></Card>}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {catalog.map((s) => (
          <Card key={s.id}>
            <CardHeader>
              <CardTitle className="text-base">{s.name}</CardTitle>
              {s.category && <div className="text-xs text-muted-foreground">{s.category}</div>}
              <div className="text-xl font-bold mt-2">{formatBDT(s.price)}<span className="text-xs text-muted-foreground font-normal"> / {s.billing_cycle.replace("_", " ")}</span></div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {s.description && <p className="text-xs text-muted-foreground">{s.description}</p>}
              <Button className="w-full" onClick={() => setOpen(s)}><ShoppingCart className="mr-2 h-4 w-4" />Order</Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Order — {open?.name}</DialogTitle>
            <DialogDescription>{formatBDT(open?.price ?? 0)}</DialogDescription>
          </DialogHeader>
          <div><Label>Notes (optional)</Label><Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
          <DialogFooter><Button onClick={submit} disabled={submitting}>Submit order</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function CpanelActions({ service }: { service: any }) {
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [ssoBusy, setSsoBusy] = useState(false);

  async function openCpanel() {
    setSsoBusy(true);
    try {
      const { cpanelSsoUrl } = await import("@/lib/whm.functions");
      const res = await cpanelSsoUrl({ data: { service_id: service.id } });
      window.open(res.url, "_blank", "noopener");
    } catch (e: any) {
      toast.error(e?.message ?? "Login failed");
    } finally { setSsoBusy(false); }
  }

  async function submit() {
    if (pw.length < 8) return toast.error("Password must be at least 8 characters");
    if (pw !== pw2) return toast.error("Passwords do not match");
    setBusy(true);
    try {
      const { cpanelChangePassword } = await import("@/lib/whm.functions");
      await cpanelChangePassword({ data: { service_id: service.id, new_password: pw } });
      toast.success("cPanel password updated");
      setOpen(false); setPw(""); setPw2("");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally { setBusy(false); }
  }

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="outline" onClick={openCpanel} disabled={ssoBusy}>
        {ssoBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Open cPanel"}
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>Change password</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Change cPanel password</DialogTitle>
            <DialogDescription>{service.name}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div><Label>New password</Label><Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" /></div>
            <div><Label>Confirm</Label><Input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" /></div>
          </div>
          <DialogFooter><Button onClick={submit} disabled={busy}>{busy ? "Updating…" : "Update"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
