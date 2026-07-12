import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listCoupons, saveCoupon, deleteCoupon } from "@/lib/addons-coupons.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/coupons")({
  ssr: false,
  component: CouponsPage,
});

function CouponsPage() {
  const list = useServerFn(listCoupons);
  const save = useServerFn(saveCoupon);
  const del = useServerFn(deleteCoupon);
  const { data, refetch } = useQuery({ queryKey: ["coupons"], queryFn: () => list() });
  const [form, setForm] = useState({ code: "", discount_percent: 10, max_uses: 0, expires_at: "" });

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold">Promo codes</h1>
        <p className="text-sm text-muted-foreground">Coupons customers can redeem at checkout.</p>
      </div>
      <Card>
        <CardHeader><CardTitle>New coupon</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-end">
          <Input placeholder="CODE" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
          <Input placeholder="Percent off" type="number" value={form.discount_percent} onChange={(e) => setForm({ ...form, discount_percent: Number(e.target.value) })} />
          <Input placeholder="Max uses (0 = ∞)" type="number" value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: Number(e.target.value) })} />
          <Input placeholder="Expires (YYYY-MM-DD)" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
          <Button onClick={async () => {
            if (!form.code) return;
            try {
              await save({ data: {
                code: form.code, discount_percent: form.discount_percent,
                max_uses: form.max_uses || null,
                expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
              }});
              setForm({ code: "", discount_percent: 10, max_uses: 0, expires_at: "" });
              refetch(); toast.success("Saved");
            } catch (e: any) { toast.error(e.message); }
          }}>Add</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>All coupons</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Discount</TableHead><TableHead>Used</TableHead><TableHead>Expires</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {(data?.items ?? []).map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell><code>{c.code}</code></TableCell>
                  <TableCell>{c.discount_percent ? `${c.discount_percent}%` : `৳${c.discount_amount}`}</TableCell>
                  <TableCell>{c.used_count}{c.max_uses ? ` / ${c.max_uses}` : ""}</TableCell>
                  <TableCell>{c.expires_at ? new Date(c.expires_at).toLocaleDateString() : "—"}</TableCell>
                  <TableCell><Button size="sm" variant="ghost" onClick={async () => { await del({ data: { id: c.id } }); refetch(); }}>Delete</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
