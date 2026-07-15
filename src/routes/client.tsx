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
import { validateDomain } from "@/lib/domain-validate";
import { supabase } from "@/integrations/supabase/client";
import { checkDomains } from "@/lib/namecheap.functions";

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
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-indigo-50 via-white to-pink-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950">
      <div className="flex-1 p-6 space-y-6 max-w-6xl w-full mx-auto">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-6 text-white shadow-lg">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-wider text-white/80">Customer portal</div>
              <h1 className="text-3xl font-bold drop-shadow-sm">{profile?.full_name ?? profile?.email}</h1>
              {profile?.company && <div className="mt-1 text-sm text-white/85">{profile.company}</div>}
            </div>
            <Button variant="secondary" size="sm" onClick={signOut} className="bg-white/95 text-slate-900 hover:bg-white">
              <LogOut className="mr-2 h-4 w-4" />Sign out
            </Button>
          </div>
        </div>

        <Tabs defaultValue="dashboard">
          <TabsList className="flex-wrap bg-white/70 dark:bg-slate-900/60 backdrop-blur border shadow-sm">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="domain">Order domain</TabsTrigger>
            <TabsTrigger value="hosting">Order hosting</TabsTrigger>
            <TabsTrigger value="service">Order service</TabsTrigger>
            <TabsTrigger value="orders">My orders</TabsTrigger>
            <TabsTrigger value="invoices">Invoices</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>


          <TabsContent value="dashboard" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="border-0 bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-md">
                <CardHeader><CardTitle className="text-sm text-white/90">Services</CardTitle></CardHeader>
                <CardContent className="text-3xl font-bold">{services.length}</CardContent>
              </Card>
              <Card className="border-0 bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-md">
                <CardHeader><CardTitle className="text-sm text-white/90">Projects</CardTitle></CardHeader>
                <CardContent className="text-3xl font-bold">{projects.length}</CardContent>
              </Card>
              <Card className="border-0 bg-gradient-to-br from-orange-500 to-pink-500 text-white shadow-md">
                <CardHeader><CardTitle className="text-sm text-white/90">Pending orders</CardTitle></CardHeader>
                <CardContent className="text-3xl font-bold">{orders.filter((o) => o.status === "pending").length}</CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader><CardTitle className="text-base">My services</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {services.length === 0 && <div className="text-muted-foreground">No services yet.</div>}
                {services.map((s) => (
                  <div key={s.id} className="space-y-2 border-b py-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="font-medium">{s.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {s.type} · expires {formatDate(s.expiry_date)}
                          {s.provisioning_status && <> · <span className="capitalize">{s.provisioning_status}</span></>}
                        </div>
                      </div>
                      {s.type === "hosting" && s.whm_server_id && <CpanelActions service={s} />}
                    </div>
                    {s.type === "domain" && <DomainTimeline serviceId={s.id} fallbackStatus={s.provisioning_status} />}
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
                    {outstanding > 0 && i.status !== "paid" && (
                      <div className="flex gap-2">
                        <BkashPayButton invoiceId={i.id} amount={outstanding} />
                        <SslczPayButton invoiceId={i.id} amount={outstanding} />
                      </div>
                    )}
                  </div>
                </CardContent></Card>
              );
            })}
          </TabsContent>
          <TabsContent value="profile">
            <ProfileTab profile={profile} onSaved={load} />
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

function SslczPayButton({ invoiceId, amount }: { invoiceId: string; amount: number }) {
  const [busy, setBusy] = useState(false);
  const pay = async () => {
    setBusy(true);
    try {
      const { sslczCreatePayment } = await import("@/lib/sslcommerz.functions");
      const callback_url = `${window.location.origin}/client/sslcz-callback`;
      const res = await sslczCreatePayment({ data: { invoice_id: invoiceId, amount, callback_url } });
      window.location.href = res.gatewayURL;
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to start SSLCommerz payment");
      setBusy(false);
    }
  };
  return <Button size="sm" variant="outline" onClick={pay} disabled={busy}>{busy ? "Redirecting…" : `Pay ${formatBDT(amount)} (Cards/Nagad)`}</Button>;
}


/* ---------- Domain ---------- */
type LiveResult = { domain: string; tld: string; available: boolean; price: number };

function DomainOrder({ uid, onSubmitted }: { uid: string; onSubmitted: () => void }) {
  const [query, setQuery] = useState("");
  const [notes, setNotes] = useState("");
  const [action, setAction] = useState<"register" | "transfer" | "renew">("register");
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [results, setResults] = useState<LiveResult[] | null>(null);

  const runCheck = async () => {
    const base = query.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0]!.split(".")[0];
    if (!base) return toast.error("Please enter a domain name");
    setChecking(true);
    setResults(null);
    try {
      const tlds = Object.entries(TLD_PRICES);
      const domains = tlds.map(([tld]) => `${base}${tld}`);
      const { results: api } = await checkDomains({ data: { domains } });
      const merged: LiveResult[] = tlds.map(([tld, price]) => {
        const domain = `${base}${tld}`;
        const hit = api.find((r) => r.domain === domain.toLowerCase());
        return { domain, tld, available: !!hit?.available, price };
      });
      setResults(merged);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Live check failed");
    } finally {
      setChecking(false);
    }
  };

  const submit = async (domain: string, price: number, wantsAction: "register" | "transfer") => {
    const v = validateDomain(domain);
    if (!v.ok) return toast.error(v.error);
    setSubmitting(true);
    const { error } = await getPortalClient().from("customer_orders").insert({
      customer_id: uid, order_type: "domain", domain_name: v.value, domain_action: wantsAction,
      quoted_price: price, customer_notes: notes || null,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Order submitted. We'll register it once payment is confirmed.");
    setNotes("");
    onSubmitted();
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Check &amp; order a domain</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <div className="flex-1">
            <Label>Search domain</Label>
            <Input placeholder="yourbrand" value={query} onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); runCheck(); } }} />
          </div>
          <div className="w-40">
            <Label>Default action</Label>
            <Select value={action} onValueChange={(v) => setAction(v as "register" | "transfer" | "renew")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="register">Register new</SelectItem>
                <SelectItem value="transfer">Transfer in</SelectItem>
                <SelectItem value="renew">Renew</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button onClick={runCheck} disabled={checking || !query.trim()}>
              {checking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
              {checking ? "Checking…" : "Check live"}
            </Button>
          </div>
        </div>
        <div><Label>Notes (optional)</Label><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        {!results && !checking && <div className="text-xs text-muted-foreground">Enter a name and press Check live — availability is queried from the registrar in real time.</div>}
        {results && (
          <div className="grid gap-2 md:grid-cols-2">
            {results.map((s) => (
              <div key={s.domain} className={"flex items-center justify-between border rounded-md p-3 " + (s.available ? "" : "opacity-60")}>
                <div>
                  <div className="font-medium text-sm">{s.domain}</div>
                  <div className="text-xs text-muted-foreground">
                    {s.available ? <span className="text-emerald-600">Available</span> : <span className="text-rose-500">Taken</span>}
                    {" · "}Quote: {formatBDT(s.price)} / yr
                  </div>
                </div>
                <Button size="sm" disabled={submitting}
                  onClick={() => submit(s.domain, s.price, s.available ? "register" : "transfer")}>
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  {s.available ? "Register" : "Transfer"}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DomainTimeline({ serviceId, fallbackStatus }: { serviceId: string; fallbackStatus?: string | null }) {
  const [events, setEvents] = useState<Array<{ id: string; status: string; message: string | null; created_at: string }> | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await getPortalClient()
        .from("service_events")
        .select("id, status, message, created_at")
        .eq("service_id", serviceId)
        .order("created_at", { ascending: true });
      if (!cancelled) setEvents((data ?? []) as never);
    })();
    return () => { cancelled = true; };
  }, [serviceId]);

  const stages = ["requested", "processing", "active"] as const;
  const currentIdx = (() => {
    if (!events || events.length === 0) return stages.indexOf((fallbackStatus as typeof stages[number]) ?? "requested");
    const last = events[events.length - 1]!.status;
    if (last === "failed") return -1;
    const i = stages.indexOf(last as typeof stages[number]);
    return i >= 0 ? i : 0;
  })();
  const failed = events?.some((e) => e.status === "failed");

  return (
    <div className="w-full rounded-md border bg-muted/30 p-3 text-xs">
      <div className="flex items-center gap-2">
        {stages.map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className={"h-6 w-6 shrink-0 rounded-full grid place-items-center text-[10px] font-bold " +
              (failed ? "bg-rose-100 text-rose-600 border border-rose-300" :
                i <= currentIdx ? "bg-emerald-500 text-white" : "bg-background border text-muted-foreground")}>
              {i + 1}
            </div>
            <div className="flex-1">
              <div className="capitalize font-medium">{s}</div>
            </div>
            {i < stages.length - 1 && <div className={"h-px flex-1 " + (i < currentIdx && !failed ? "bg-emerald-500" : "bg-border")} />}
          </div>
        ))}
        {failed && <Badge variant="destructive">Failed</Badge>}
      </div>
      {events && events.length > 0 && (
        <ul className="mt-3 space-y-1 border-t pt-2">
          {events.slice(-4).map((e) => (
            <li key={e.id} className="flex items-start gap-2">
              <span className="text-muted-foreground shrink-0">{formatDate(e.created_at)}</span>
              <span className="capitalize font-medium">{e.status}</span>
              {e.message && <span className="text-muted-foreground">— {e.message}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
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
    const v = validateDomain(domainName);
    if (!v.ok) return toast.error(v.error);
    setSubmitting(true);
    const { error } = await getPortalClient().from("customer_orders").insert({
      customer_id: uid, order_type: "hosting", hosting_package_id: open.id,
      domain_name: v.value,
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

/* ---------- Profile ---------- */
function ProfileTab({ profile, onSaved }: { profile: any; onSaved: () => void }) {
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [email, setEmail] = useState(profile?.email ?? "");
  const [company, setCompany] = useState(profile?.company ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [address, setAddress] = useState(profile?.address ?? "");
  const [saving, setSaving] = useState(false);

  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [pwBusy, setPwBusy] = useState(false);

  useEffect(() => {
    setFullName(profile?.full_name ?? "");
    setEmail(profile?.email ?? "");
    setCompany(profile?.company ?? "");
    setPhone(profile?.phone ?? "");
    setAddress(profile?.address ?? "");
  }, [profile]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) return toast.error("Full name is required");
    setSaving(true);
    const client = getPortalClient();
    const { data: u } = await client.auth.getUser();
    if (!u.user) { setSaving(false); return toast.error("Session expired"); }
    const { error } = await client.from("profiles").update({
      full_name: fullName.trim(),
      email: email.trim() || null,
      company: company.trim() || null,
      phone: phone.trim() || null,
      address: address.trim() || null,
    }).eq("id", u.user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Profile updated");
    onSaved();
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 6) return toast.error("Password must be at least 6 characters");
    if (pw !== pw2) return toast.error("Passwords do not match");
    setPwBusy(true);
    // Use main supabase client so the currently signed-in browser session updates.
    const { error } = await supabase.auth.updateUser({ password: pw });
    setPwBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Password changed");
    setPw(""); setPw2("");
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader><CardTitle className="text-base">Profile information</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={saveProfile} className="space-y-3">
            <div><Label>Full name</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
            <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div><Label>Company</Label><Input value={company} onChange={(e) => setCompany(e.target.value)} /></div>
            <div><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
            <div><Label>Address</Label><Textarea rows={2} value={address} onChange={(e) => setAddress(e.target.value)} /></div>
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save profile"}</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Change password</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={changePassword} className="space-y-3">
            <div><Label>New password</Label><Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" /></div>
            <div><Label>Confirm new password</Label><Input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" /></div>
            <Button type="submit" disabled={pwBusy}>{pwBusy ? "Updating…" : "Change password"}</Button>
            <p className="text-xs text-muted-foreground">Minimum 6 characters.</p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
