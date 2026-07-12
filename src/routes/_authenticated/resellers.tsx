import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listResellers, setResellerRole, linkResellerCustomer } from "@/lib/reseller.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/resellers")({
  ssr: false,
  component: ResellersPage,
});

function ResellersPage() {
  const list = useServerFn(listResellers);
  const setRole = useServerFn(setResellerRole);
  const link = useServerFn(linkResellerCustomer);
  const { data, refetch } = useQuery({ queryKey: ["resellers"], queryFn: () => list() });
  const [email, setEmail] = useState("");
  const [linkFor, setLinkFor] = useState<string | null>(null);
  const [custEmail, setCustEmail] = useState("");

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold">Resellers</h1>
        <p className="text-sm text-muted-foreground">Grant reseller access and link customers to a reseller. Resellers see only their linked customers via the API and portal.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Grant reseller role</CardTitle></CardHeader>
        <CardContent className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground">User email</label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com" />
          </div>
          <Button onClick={async () => {
            try { await setRole({ data: { email: email.trim(), grant: true } }); setEmail(""); toast.success("Granted"); refetch(); }
            catch (e: any) { toast.error(e.message); }
          }}>Grant</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Current resellers</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Customers</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {(data?.items ?? []).map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell>{r.full_name ?? "—"}</TableCell>
                  <TableCell>{r.email}</TableCell>
                  <TableCell>{r.customer_count}</TableCell>
                  <TableCell className="space-x-2">
                    <Button size="sm" variant="outline" onClick={() => setLinkFor(r.id)}>Link customer</Button>
                    <Button size="sm" variant="ghost" onClick={async () => {
                      try { await setRole({ data: { email: r.email, grant: false } }); toast.success("Revoked"); refetch(); }
                      catch (e: any) { toast.error(e.message); }
                    }}>Revoke</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {linkFor && (
        <Card>
          <CardHeader><CardTitle>Link customer to reseller</CardTitle></CardHeader>
          <CardContent className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground">Customer email</label>
              <Input value={custEmail} onChange={(e) => setCustEmail(e.target.value)} placeholder="customer@example.com" />
            </div>
            <Button onClick={async () => {
              try { await link({ data: { reseller_id: linkFor, customer_email: custEmail.trim(), link: true } }); toast.success("Linked"); setCustEmail(""); setLinkFor(null); refetch(); }
              catch (e: any) { toast.error(e.message); }
            }}>Link</Button>
            <Button variant="ghost" onClick={() => setLinkFor(null)}>Cancel</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
