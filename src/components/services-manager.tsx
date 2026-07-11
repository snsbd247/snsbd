import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, ExternalLink, Check, ChevronsUpDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { formatBDT, formatDate, daysUntil } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

type ServiceType = "domain" | "hosting" | "software" | "other";

export function ServicesManager({
  filterType,
  title,
  subtitle,
  lockType,
}: {
  filterType?: ServiceType;
  title: string;
  subtitle: string;
  lockType?: ServiceType;
}) {
  const { role } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const { data: services, isLoading } = useQuery({
    queryKey: ["services", filterType ?? "all"],
    queryFn: async () => {
      let q = supabase.from("services").select("*, profiles(full_name, email), projects(id, name)").order("created_at", { ascending: false });
      if (filterType) q = q.eq("type", filterType);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: customers } = useQuery({
    queryKey: ["customer-list"],
    enabled: role === "admin",
    queryFn: async () => (await supabase.from("profiles").select("id, full_name, email").order("full_name")).data ?? [],
  });

  const { data: projects } = useQuery({
    queryKey: ["project-list"],
    enabled: role === "admin",
    queryFn: async () => (await supabase.from("projects").select("id, name, customer_id").order("name")).data ?? [],
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("services").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["services"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        {role === "admin" && (
          <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="mr-2 h-4 w-4" />Add {lockType ?? "service"}</Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                {!lockType && <TableHead>Type</TableHead>}
                {role === "admin" && <TableHead>Customer</TableHead>}
                <TableHead>Project</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-32" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={8} className="text-center py-8 text-sm text-muted-foreground">Loading…</TableCell></TableRow>}
              {!isLoading && (services ?? []).length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-8 text-sm text-muted-foreground">No {lockType ?? "service"}s yet.</TableCell></TableRow>}
              {(services ?? []).map((s: any) => {
                const days = daysUntil(s.expiry_date);
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">
                      {s.type === "domain"
                        ? <Link to="/domains/$domainId" params={{ domainId: s.id }} className="text-primary hover:underline">{s.name}</Link>
                        : <Link to="/services/$serviceId" params={{ serviceId: s.id }} className="text-primary hover:underline">{s.name}</Link>}
                      <div className="text-xs text-muted-foreground">{s.details}</div>
                    </TableCell>
                    {!lockType && <TableCell><Badge variant="outline" className="capitalize">{s.type}</Badge></TableCell>}
                    {role === "admin" && <TableCell>{s.profiles?.full_name ?? s.profiles?.email ?? "—"}</TableCell>}
                    <TableCell>{s.projects?.name ? <Link to="/projects/$projectId" params={{ projectId: s.projects.id }} className="text-xs hover:underline">{s.projects.name}</Link> : <span className="text-xs text-muted-foreground">—</span>}</TableCell>
                    <TableCell>
                      {formatDate(s.expiry_date)}
                      {days != null && (
                        <Badge variant={days < 0 ? "destructive" : days <= 30 ? "secondary" : "outline"} className="ml-2">
                          {days < 0 ? "Expired" : `${days}d`}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{formatBDT(s.sale_price)}</TableCell>
                    <TableCell><Badge variant={s.status === "active" ? "default" : "secondary"} className="capitalize">{s.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      {s.type === "domain"
                        ? <Button size="icon" variant="ghost" asChild><Link to="/domains/$domainId" params={{ domainId: s.id }}><ExternalLink className="h-4 w-4" /></Link></Button>
                        : <Button size="icon" variant="ghost" asChild><Link to="/services/$serviceId" params={{ serviceId: s.id }}><ExternalLink className="h-4 w-4" /></Link></Button>}
                      {role === "admin" && (
                        <>
                          <Button size="icon" variant="ghost" onClick={() => { setEditing(s); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => { if (confirm("Delete?")) del.mutate(s.id); }}><Trash2 className="h-4 w-4" /></Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {role === "admin" && (
        <ServiceDialog
          open={open}
          onOpenChange={setOpen}
          editing={editing}
          customers={customers ?? []}
          projects={projects ?? []}
          lockType={lockType}
        />
      )}
    </div>
  );
}

const empty = (t: ServiceType = "other") => ({
  customer_id: "", project_id: "", type: t, name: "", details: "",
  purchase_date: "", expiry_date: "", cost_price: "0", sale_price: "0", status: "active", notes: "",
  renewable: false,
  cpanel_url: "", cpanel_username: "", cpanel_password: "",
  hosting_package_id: "",
  whm_server_id: "",
});



function ServiceDialog({ open, onOpenChange, editing, customers, projects, lockType }: any) {
  const qc = useQueryClient();
  const [f, setF] = useState<any>(empty(lockType));
  const [origPassword, setOrigPassword] = useState<string>("");
  const [autoProvision, setAutoProvision] = useState(true);

  const { data: packages } = useQuery({
    queryKey: ["hosting_packages_active"],
    queryFn: async () => (await supabase.from("hosting_packages").select("id, name, price, billing_cycle, disk_space, bandwidth, is_active").order("sort_order").order("price")).data ?? [],
  });

  const { data: whmServers } = useQuery({
    queryKey: ["whm_servers_list"],
    queryFn: async () => (await supabase.from("whm_servers").select("id, name, hostname").order("name")).data ?? [],
  });

  useEffect(() => {
    if (open) {
      if (editing) {
        setF({
          customer_id: editing.customer_id, project_id: editing.project_id ?? "", type: editing.type, name: editing.name,
          details: editing.details ?? "", purchase_date: editing.purchase_date ?? "",
          expiry_date: editing.expiry_date ?? "", cost_price: String(editing.cost_price ?? "0"),
          sale_price: String(editing.sale_price ?? "0"), status: editing.status, notes: editing.notes ?? "",
          renewable: !!editing.renewable,
          cpanel_url: editing.cpanel_url ?? "", cpanel_username: editing.cpanel_username ?? "", cpanel_password: editing.cpanel_password ?? "",
          hosting_package_id: editing.hosting_package_id ?? "",
          whm_server_id: editing.whm_server_id ?? "",
        });
        setOrigPassword(editing.cpanel_password ?? "");
      } else {
        setF(empty(lockType));
        setOrigPassword("");
      }
      setAutoProvision(true);
    }
  }, [open, editing, lockType]);

  const save = useMutation({
    mutationFn: async () => {
      const payload: any = {
        ...f,
        project_id: f.project_id || null,
        hosting_package_id: f.type === "hosting" ? (f.hosting_package_id || null) : null,
        whm_server_id: f.type === "hosting" ? (f.whm_server_id || null) : null,
        whm_account_user: f.type === "hosting" ? (f.cpanel_username || null) : null,
        cost_price: Number(f.cost_price) || 0,
        sale_price: Number(f.sale_price) || 0,
        purchase_date: f.purchase_date || null,
        expiry_date: f.expiry_date || null,
      };
      let serviceId: string;
      if (editing) {
        const { error } = await supabase.from("services").update(payload).eq("id", editing.id);
        if (error) throw error;
        serviceId = editing.id;
      } else {
        const { data, error } = await supabase.from("services").insert(payload).select("id").single();
        if (error) throw error;
        serviceId = data.id;
      }

      // WHM automation for hosting rows
      if (autoProvision && f.type === "hosting" && f.whm_server_id) {
        const { cpanelCreateAccount, cpanelChangePassword } = await import("@/lib/whm.functions");
        if (!editing) {
          await cpanelCreateAccount({ data: { service_id: serviceId } });
          toast.success("cPanel account created on WHM");
        } else if (f.cpanel_password && f.cpanel_password !== origPassword) {
          await cpanelChangePassword({ data: { service_id: serviceId, new_password: f.cpanel_password } });
          toast.success("cPanel password updated on WHM");
        }
      }
    },
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["services"] }); onOpenChange(false); },
    onError: (e: Error) => toast.error(e.message),
  });


  const filteredProjects = (projects ?? []).filter((p: any) => !f.customer_id || p.customer_id === f.customer_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{editing ? "Edit" : "Add"} {lockType ?? "service"}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div>
            <Label>Customer</Label>
            <Select value={f.customer_id} onValueChange={(v) => setF({ ...f, customer_id: v, project_id: "" })}>
              <SelectTrigger><SelectValue placeholder="Choose customer" /></SelectTrigger>
              <SelectContent>{customers.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.full_name ?? c.email}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Project (optional)</Label>
            <Select value={f.project_id || "none"} onValueChange={(v) => setF({ ...f, project_id: v === "none" ? "" : v })}>
              <SelectTrigger><SelectValue placeholder="Link to project" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— None —</SelectItem>
                {filteredProjects.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {!lockType && (
              <div>
                <Label>Type</Label>
                <Select value={f.type} onValueChange={(v) => setF({ ...f, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="domain">Domain</SelectItem>
                    <SelectItem value="hosting">Hosting</SelectItem>
                    <SelectItem value="software">Software</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className={lockType ? "col-span-2" : ""}>
              <Label>Status</Label>
              <Select value={f.status} onValueChange={(v) => setF({ ...f, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Name</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="example.com / Business Hosting / CRM License" /></div>
          <div><Label>Details</Label><Input value={f.details} onChange={(e) => setF({ ...f, details: e.target.value })} placeholder="Registrar / plan / version" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Purchase date</Label><Input type="date" value={f.purchase_date} onChange={(e) => setF({ ...f, purchase_date: e.target.value })} /></div>
            <div><Label>Expiry date</Label><Input type="date" value={f.expiry_date} onChange={(e) => setF({ ...f, expiry_date: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Cost (৳)</Label><Input type="number" step="0.01" value={f.cost_price} onChange={(e) => setF({ ...f, cost_price: e.target.value })} /></div>
            <div><Label>Sale price (৳)</Label><Input type="number" step="0.01" value={f.sale_price} onChange={(e) => setF({ ...f, sale_price: e.target.value })} /></div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!f.renewable} onChange={(e) => setF({ ...f, renewable: e.target.checked })} />
            Renewable — auto-generate a draft invoice 10 days before expiry
          </label>
          {f.type === "hosting" && (
            <div>
              <Label>Hosting package (optional)</Label>
              <PackageCombobox
                packages={packages ?? []}
                value={f.hosting_package_id}
                onChange={(id) => {
                  if (!id) { setF({ ...f, hosting_package_id: "" }); return; }
                  const pkg = (packages ?? []).find((p: any) => p.id === id);
                  if (!pkg) { setF({ ...f, hosting_package_id: id }); return; }
                  setF({
                    ...f,
                    hosting_package_id: id,
                    name: pkg.name ?? "",
                    details: [pkg.disk_space, pkg.bandwidth].filter(Boolean).join(" / "),
                    sale_price: String(pkg.price ?? "0"),
                  });
                  toast.success(`Filled from package “${pkg.name}”`);
                }}
              />
              <p className="mt-1 text-xs text-muted-foreground">Selecting a package auto-fills name, details and price. You can still edit them below.</p>
            </div>
          )}
          {f.type === "hosting" && (
            <div className="grid gap-3 rounded-md border p-3 bg-muted/30">
              <div className="text-xs font-semibold uppercase text-muted-foreground">cPanel login</div>
              <div><Label>cPanel URL</Label><Input value={f.cpanel_url} onChange={(e) => setF({ ...f, cpanel_url: e.target.value })} placeholder="https://server.example.com:2083" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Username</Label><Input value={f.cpanel_username} onChange={(e) => setF({ ...f, cpanel_username: e.target.value })} autoComplete="off" /></div>
                <div><Label>Password</Label><Input type="password" value={f.cpanel_password} onChange={(e) => setF({ ...f, cpanel_password: e.target.value })} autoComplete="new-password" /></div>
              </div>
            </div>
          )}
          <div><Label>Notes</Label><Textarea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>

        </div>
        <DialogFooter><Button onClick={() => save.mutate()} disabled={save.isPending || !f.customer_id || !f.name}>Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PackageCombobox({ packages, value, onChange }: { packages: any[]; value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const selected = packages.find((p) => p.id === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className={cn("w-full justify-between font-normal", !selected && "text-muted-foreground")}>
          {selected ? `${selected.name} — ${formatBDT(selected.price)}/${selected.billing_cycle}` : "Search & select a package…"}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search by package name…" />
          <CommandList>
            <CommandEmpty>No package found.</CommandEmpty>
            <CommandGroup>
              <CommandItem value="__none__" onSelect={() => { onChange(""); setOpen(false); }}>
                <Check className={cn("mr-2 h-4 w-4", !value ? "opacity-100" : "opacity-0")} />
                — None (custom) —
              </CommandItem>
              {packages.map((p) => (
                <CommandItem
                  key={p.id}
                  value={`${p.name} ${p.disk_space ?? ""} ${p.bandwidth ?? ""}`}
                  onSelect={() => { onChange(p.id); setOpen(false); }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === p.id ? "opacity-100" : "opacity-0")} />
                  <div className="flex-1">
                    <div className="text-sm">{p.name}{!p.is_active && <span className="ml-2 text-xs text-muted-foreground">(hidden)</span>}</div>
                    <div className="text-xs text-muted-foreground">{[p.disk_space, p.bandwidth].filter(Boolean).join(" / ") || "—"} · {formatBDT(p.price)}/{p.billing_cycle}</div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
