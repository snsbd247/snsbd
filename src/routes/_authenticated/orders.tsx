import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { formatBDT, formatDate } from "@/lib/format";
import { activateHostingOrder } from "@/lib/orders.functions";
import { useState } from "react";
import { CheckCircle2, Copy, Loader2 } from "lucide-react";
import { db } from "@/lib/db-shim";
import { ClickableRow, StopClick } from "@/components/ui/clickable-row";
import { Eye } from "lucide-react";
import { usePagination, PaginationControls } from "@/components/ui/pagination-controls";


export const Route = createFileRoute("/_authenticated/orders")({
  component: OrdersPage,
});

const STATUSES = ["pending", "processing", "completed", "cancelled", "rejected"] as const;

function OrdersPage() {
  const { role } = useAuth();
  const qc = useQueryClient();
  const [activate, setActivate] = useState<any | null>(null);
  const [whmServerId, setWhmServerId] = useState<string>("");
  const [result, setResult] = useState<{ cpanel_username: string; cpanel_password: string; whm_created: boolean; whm_error: string | null } | null>(null);

  const { data: rows } = useQuery({
    queryKey: ["customer_orders"],
    queryFn: async () => (await db.from("customer_orders")
      .select("*, hosting_packages(name), service_catalog(name), profiles!customer_orders_customer_id_fkey(full_name, email)")
      .order("created_at", { ascending: false })).data ?? [],
  });

  const { data: whmServers } = useQuery({
    queryKey: ["whm_servers"],
    enabled: role === "admin",
    queryFn: async () => (await db.from("whm_servers").select("id, name").order("name")).data ?? [],
  });

  const update = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await db.from("customer_orders").update({ status: status as any }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Updated"); qc.invalidateQueries({ queryKey: ["customer_orders"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const activateMut = useMutation({
    mutationFn: async () => {
      if (!activate) throw new Error("No order");
      return await activateHostingOrder({ data: { order_id: activate.id, whm_server_id: whmServerId || null } });
    },
    onSuccess: (r: any) => {
      setResult({ cpanel_username: r.cpanel_username, cpanel_password: r.cpanel_password, whm_created: r.whm_created, whm_error: r.whm_error });
      toast.success(r.whm_created ? "Activated and cPanel created" : "Activated");
      qc.invalidateQueries({ queryKey: ["customer_orders"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (role !== "admin") return <p className="text-sm text-muted-foreground">Admin only.</p>;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Customer Orders</h1><p className="text-sm text-muted-foreground">Orders submitted from customer portals.</p></div>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Date</TableHead><TableHead>Customer</TableHead><TableHead>Type</TableHead>
            <TableHead>Item</TableHead><TableHead>Payment</TableHead><TableHead>Price</TableHead>
            <TableHead>Status</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {(rows ?? []).map((o: any) => (
              <ClickableRow key={o.id} to="/orders/$orderId" params={{ orderId: o.id }}>
                <TableCell className="text-xs">{formatDate(o.created_at)}</TableCell>
                <TableCell className="text-sm">{o.profiles?.full_name ?? o.profiles?.email ?? "—"}</TableCell>
                <TableCell className="capitalize">
                  <Badge variant="outline">{o.order_type}</Badge>
                  {o.domain_action && <span className="ml-2 text-xs text-muted-foreground capitalize">{o.domain_action.replace("_", " ")}</span>}
                </TableCell>
                <TableCell>
                  <div className="text-sm">{o.hosting_packages?.name ?? o.service_catalog?.name ?? o.domain_name ?? "—"}</div>
                  {o.domain_name && (o.hosting_packages || o.service_catalog) && <div className="text-xs text-muted-foreground">{o.domain_name}</div>}
                  {o.customer_notes && <div className="text-xs text-muted-foreground mt-1 italic">"{o.customer_notes}"</div>}
                </TableCell>
                <TableCell className="text-xs">
                  {o.payment_method && <div className="capitalize">{o.payment_method.replace("_", " ")}</div>}
                  {o.manual_trx_id && <div className="font-mono text-[10px]">TRX: {o.manual_trx_id}</div>}
                  {o.manual_sender && <div className="text-[10px] text-muted-foreground">{o.manual_sender}</div>}
                </TableCell>
                <TableCell>{formatBDT(o.quoted_price)}</TableCell>
                <TableCell>
                  <StopClick>
                    <Select value={o.status} onValueChange={(v) => update.mutate({ id: o.id, status: v })}>
                      <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </StopClick>
                </TableCell>
                <TableCell className="space-x-2 whitespace-nowrap">
                  <StopClick>
                    <Button asChild size="icon" variant="ghost" className="hover:bg-sky-100 hover:text-sky-700 dark:hover:bg-sky-950/40">
                      <Link to="/orders/$orderId" params={{ orderId: o.id }}><Eye className="h-4 w-4" /></Link>
                    </Button>
                    {o.order_type === "hosting" && o.status !== "completed" && (
                      <Button size="sm" onClick={() => { setActivate(o); setWhmServerId(""); setResult(null); }}>
                        <CheckCircle2 className="mr-1 h-3 w-3" />Activate
                      </Button>
                    )}
                  </StopClick>
                </TableCell>
              </ClickableRow>
            ))}

            {rows && rows.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">No orders yet.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={!!activate} onOpenChange={(v) => { if (!v) { setActivate(null); setResult(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{result ? "Order activated" : "Verify & Activate Hosting Order"}</DialogTitle>
            <DialogDescription>
              {result
                ? "Share these credentials with the customer. They can also be viewed on the hosting details page."
                : `Confirm payment for ${activate?.hosting_packages?.name ?? activate?.domain_name} (${formatBDT(activate?.quoted_price)}). This will create the hosting service and optionally a cPanel account on WHM.`}
            </DialogDescription>
          </DialogHeader>

          {!result && (
            <div className="space-y-4">
              {activate?.manual_trx_id && (
                <div className="rounded-md bg-muted p-3 text-sm">
                  <div><span className="text-muted-foreground">bKash TRX ID:</span> <span className="font-mono">{activate.manual_trx_id}</span></div>
                  {activate.manual_sender && <div><span className="text-muted-foreground">Sender:</span> {activate.manual_sender}</div>}
                </div>
              )}
              <div>
                <Label>WHM Server (optional — creates cPanel account)</Label>
                <Select value={whmServerId} onValueChange={setWhmServerId}>
                  <SelectTrigger><SelectValue placeholder="Skip WHM (create service only)" /></SelectTrigger>
                  <SelectContent>
                    {(whmServers ?? []).map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {result && (
            <div className="space-y-2 text-sm">
              <CredRow label="cPanel Username" value={result.cpanel_username} />
              <CredRow label="cPanel Password" value={result.cpanel_password} />
              {result.whm_created && <p className="text-xs text-emerald-600">✓ cPanel account created on WHM.</p>}
              {result.whm_error && <p className="text-xs text-amber-600">WHM error: {result.whm_error}</p>}
              {!result.whm_created && !result.whm_error && <p className="text-xs text-muted-foreground">No WHM server linked — service created with credentials only.</p>}
            </div>
          )}

          <DialogFooter>
            {!result ? (
              <>
                <Button variant="outline" onClick={() => setActivate(null)}>Cancel</Button>
                <Button onClick={() => activateMut.mutate()} disabled={activateMut.isPending}>
                  {activateMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Activate
                </Button>
              </>
            ) : (
              <Button onClick={() => { setActivate(null); setResult(null); }}>Done</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CredRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded border p-2">
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="font-mono">{value}</div>
      </div>
      <Button size="icon" variant="ghost" onClick={() => { navigator.clipboard.writeText(value); toast.success("Copied"); }}>
        <Copy className="h-3 w-3" />
      </Button>
    </div>
  );
}
