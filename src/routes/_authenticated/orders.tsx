import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { formatBDT, formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/orders")({
  component: OrdersPage,
});

const STATUSES = ["pending", "processing", "completed", "cancelled", "rejected"] as const;

function OrdersPage() {
  const { role } = useAuth();
  const qc = useQueryClient();
  const { data: rows } = useQuery({
    queryKey: ["customer_orders"],
    queryFn: async () => (await supabase.from("customer_orders")
      .select("*, hosting_packages(name), service_catalog(name), profiles!customer_orders_customer_id_fkey(full_name, email)")
      .order("created_at", { ascending: false })).data ?? [],
  });
  const update = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("customer_orders").update({ status: status as any }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Updated"); qc.invalidateQueries({ queryKey: ["customer_orders"] }); },
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
            <TableHead>Item</TableHead><TableHead>Price</TableHead><TableHead>Status</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {(rows ?? []).map((o: any) => (
              <TableRow key={o.id}>
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
                <TableCell>{formatBDT(o.quoted_price)}</TableCell>
                <TableCell>
                  <Select value={o.status} onValueChange={(v) => update.mutate({ id: o.id, status: v })}>
                    <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
            {rows && rows.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">No orders yet.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
