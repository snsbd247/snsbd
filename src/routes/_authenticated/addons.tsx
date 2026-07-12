import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listAddons, saveAddon, deleteAddon } from "@/lib/addons-coupons.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/addons")({
  ssr: false,
  component: AddonsPage,
});

function AddonsPage() {
  const list = useServerFn(listAddons);
  const save = useServerFn(saveAddon);
  const del = useServerFn(deleteAddon);
  const { data, refetch } = useQuery({ queryKey: ["addons"], queryFn: () => list() });
  const [form, setForm] = useState({ name: "", price: 0, billing_cycle: "monthly", description: "" });

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold">Product add-ons</h1>
        <p className="text-sm text-muted-foreground">Optional extras that customers can attach to their services.</p>
      </div>
      <Card>
        <CardHeader><CardTitle>New add-on</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
          <Input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Input placeholder="Price" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
          <div className="flex gap-2">
            <select className="border rounded px-2 py-2 text-sm flex-1" value={form.billing_cycle} onChange={(e) => setForm({ ...form, billing_cycle: e.target.value })}>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
              <option value="one_time">One-time</option>
            </select>
            <Button onClick={async () => {
              if (!form.name) return;
              try { await save({ data: form }); setForm({ name: "", price: 0, billing_cycle: "monthly", description: "" }); refetch(); toast.success("Saved"); }
              catch (e: any) { toast.error(e.message); }
            }}>Add</Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>All add-ons</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Price</TableHead><TableHead>Cycle</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {(data?.items ?? []).map((a: any) => (
                <TableRow key={a.id}>
                  <TableCell>{a.name}</TableCell>
                  <TableCell>৳{a.price}</TableCell>
                  <TableCell>{a.billing_cycle}</TableCell>
                  <TableCell><Button size="sm" variant="ghost" onClick={async () => { await del({ data: { id: a.id } }); refetch(); }}>Delete</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
