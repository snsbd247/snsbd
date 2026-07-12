import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listApiKeys, createApiKey, revokeApiKey } from "@/lib/api-keys.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/api-keys")({
  ssr: false,
  component: ApiKeysPage,
});

function ApiKeysPage() {
  const list = useServerFn(listApiKeys);
  const create = useServerFn(createApiKey);
  const revoke = useServerFn(revokeApiKey);
  const router = useRouter();
  const { data, refetch } = useQuery({ queryKey: ["api-keys"], queryFn: () => list() });
  const [name, setName] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold">API Keys</h1>
        <p className="text-sm text-muted-foreground">Programmatic access to your account via the public REST API at <code>/api/public/v1/*</code>.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Create key</CardTitle></CardHeader>
        <CardContent className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Production server" />
          </div>
          <Button
            onClick={async () => {
              if (!name.trim()) return;
              const r = await create({ data: { name: name.trim(), scopes: ["read"] } });
              setNewKey(r.key);
              setName("");
              await refetch();
              router.invalidate();
            }}
          >Create</Button>
        </CardContent>
      </Card>

      {newKey && (
        <Card className="border-primary">
          <CardHeader><CardTitle className="text-primary">Copy this key now — it won't be shown again</CardTitle></CardHeader>
          <CardContent>
            <code className="block p-2 bg-muted rounded text-sm break-all">{newKey}</code>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => { navigator.clipboard.writeText(newKey); toast.success("Copied"); }}>Copy</Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Your keys</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Prefix</TableHead><TableHead>Scopes</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {(data?.items ?? []).map((k: any) => (
                <TableRow key={k.id}>
                  <TableCell>{k.name}</TableCell>
                  <TableCell><code className="text-xs">{k.key_prefix}…</code></TableCell>
                  <TableCell>{k.scopes.join(", ")}</TableCell>
                  <TableCell>{k.revoked_at ? <span className="text-muted-foreground">revoked</span> : <span className="text-green-600">active</span>}</TableCell>
                  <TableCell>
                    {!k.revoked_at && (
                      <Button size="sm" variant="ghost" onClick={async () => { await revoke({ data: { id: k.id } }); refetch(); }}>Revoke</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Usage</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>Send your key as <code>Authorization: Bearer YOUR_KEY</code>.</p>
          <pre className="bg-muted p-2 rounded overflow-auto text-xs">{`curl -H "Authorization: Bearer YOUR_KEY" \\
  ${typeof window !== "undefined" ? window.location.origin : ""}/api/public/v1/services`}</pre>
          <p>Endpoints: <code>GET /api/public/v1/services</code>, <code>GET /api/public/v1/invoices</code>.</p>
        </CardContent>
      </Card>
    </div>
  );
}
