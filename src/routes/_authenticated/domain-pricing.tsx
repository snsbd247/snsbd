import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { Plus, Trash2, Save } from "lucide-react";
import { db } from "@/lib/db-shim";
import { usePagination, PaginationControls } from "@/components/ui/pagination-controls";

export const Route = createFileRoute("/_authenticated/domain-pricing")({
  component: Page,
});

type Row = {
  id: string;
  tld: string;
  register_price: number;
  renew_price: number;
  transfer_price: number;
  featured: boolean;
  is_active: boolean;
  sort_order: number;
};

function Page() {
  const { role } = useAuth();
  const qc = useQueryClient();
  const [newTld, setNewTld] = useState({ tld: "", register_price: 0, renew_price: 0, transfer_price: 0 });

  const { data: rows } = useQuery({
    queryKey: ["domain_pricing_admin"],
    queryFn: async () => {
      const { data, error } = await db.from("domain_pricing").select("*").order("sort_order");
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const update = useMutation({
    mutationFn: async (r: Partial<Row> & { id: string }) => {
      const { error } = await db.from("domain_pricing").update(r).eq("id", r.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["domain_pricing_admin"] }); qc.invalidateQueries({ queryKey: ["domain_pricing"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("domain_pricing").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["domain_pricing_admin"] }); qc.invalidateQueries({ queryKey: ["domain_pricing"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const create = useMutation({
    mutationFn: async () => {
      const tld = newTld.tld.trim().toLowerCase();
      if (!tld) throw new Error("TLD required");
      const t = tld.startsWith(".") ? tld : `.${tld}`;
      const { error } = await db.from("domain_pricing").insert({
        tld: t,
        register_price: Number(newTld.register_price) || 0,
        renew_price: Number(newTld.renew_price) || 0,
        transfer_price: Number(newTld.transfer_price) || 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Added");
      setNewTld({ tld: "", register_price: 0, renew_price: 0, transfer_price: 0 });
      qc.invalidateQueries({ queryKey: ["domain_pricing_admin"] });
      qc.invalidateQueries({ queryKey: ["domain_pricing"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (role !== "admin") return <p className="text-sm text-muted-foreground">Admin only.</p>;

  const pg = usePagination((rows ?? []) as Row[]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Domain Pricing</h1>
        <p className="text-sm text-muted-foreground">These prices are shown on the public domain pages.</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="text-sm font-semibold mb-3">Add new TLD</div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-5">
            <Input placeholder=".com" value={newTld.tld} onChange={(e) => setNewTld({ ...newTld, tld: e.target.value })} />
            <Input type="number" placeholder="Register" value={newTld.register_price} onChange={(e) => setNewTld({ ...newTld, register_price: +e.target.value })} />
            <Input type="number" placeholder="Renew" value={newTld.renew_price} onChange={(e) => setNewTld({ ...newTld, renew_price: +e.target.value })} />
            <Input type="number" placeholder="Transfer" value={newTld.transfer_price} onChange={(e) => setNewTld({ ...newTld, transfer_price: +e.target.value })} />
            <Button onClick={() => create.mutate()} disabled={create.isPending}><Plus className="mr-2 h-4 w-4" />Add</Button>
          </div>
        </CardContent>
      </Card>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>TLD</TableHead><TableHead>Register (৳)</TableHead><TableHead>Renew (৳)</TableHead>
            <TableHead>Transfer (৳)</TableHead><TableHead>Sort</TableHead>
            <TableHead>Featured</TableHead><TableHead>Active</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {(rows ?? []).map((r) => <EditableRow key={r.id} row={r} onSave={(patch) => update.mutate({ id: r.id, ...patch })} onDelete={() => remove.mutate(r.id)} />)}
            {rows && rows.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">No TLDs yet.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}

function EditableRow({ row, onSave, onDelete }: { row: Row; onSave: (r: Partial<Row>) => void; onDelete: () => void }) {
  const [r, setR] = useState(row);
  const dirty = JSON.stringify(r) !== JSON.stringify(row);
  return (
    <TableRow>
      <TableCell><Input value={r.tld} onChange={(e) => setR({ ...r, tld: e.target.value })} className="h-8 w-24" /></TableCell>
      <TableCell><Input type="number" value={r.register_price} onChange={(e) => setR({ ...r, register_price: +e.target.value })} className="h-8 w-24" /></TableCell>
      <TableCell><Input type="number" value={r.renew_price} onChange={(e) => setR({ ...r, renew_price: +e.target.value })} className="h-8 w-24" /></TableCell>
      <TableCell><Input type="number" value={r.transfer_price} onChange={(e) => setR({ ...r, transfer_price: +e.target.value })} className="h-8 w-24" /></TableCell>
      <TableCell><Input type="number" value={r.sort_order} onChange={(e) => setR({ ...r, sort_order: +e.target.value })} className="h-8 w-16" /></TableCell>
      <TableCell><Switch checked={r.featured} onCheckedChange={(v) => setR({ ...r, featured: v })} /></TableCell>
      <TableCell><Switch checked={r.is_active} onCheckedChange={(v) => setR({ ...r, is_active: v })} /></TableCell>
      <TableCell className="text-right">
        <div className="flex gap-1 justify-end">
          {dirty && <Button size="sm" onClick={() => onSave(r)}><Save className="h-3 w-3" /></Button>}
          <Button size="sm" variant="ghost" onClick={onDelete}><Trash2 className="h-3 w-3" /></Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
