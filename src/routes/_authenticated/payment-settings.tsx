import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { db } from "@/lib/db-shim";

export const Route = createFileRoute("/_authenticated/payment-settings")({
  component: PaymentSettingsPage,
});

const PROVIDERS = [
  { key: "bkash", label: "bKash Merchant (Tokenized Checkout)" },
  { key: "nagad", label: "Nagad Merchant" },
] as const;

function PaymentSettingsPage() {
  const { role } = useAuth();
  if (role !== "admin") return <p className="text-sm text-muted-foreground">Admin only.</p>;
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Payment Gateways</h1><p className="text-sm text-muted-foreground">Configure bKash and Nagad merchant API credentials.</p></div>
      {PROVIDERS.map((p) => <GatewayCard key={p.key} provider={p.key} label={p.label} />)}
    </div>
  );
}

function GatewayCard({ provider, label }: { provider: "bkash" | "nagad"; label: string }) {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["payment_gateway", provider],
    queryFn: async () => (await db.from("payment_gateways").select("*").eq("provider", provider).maybeSingle()).data,
  });
  const [f, setF] = useState({
    mode: "sandbox" as "sandbox" | "live",
    app_key: "", app_secret: "", username: "", password: "", merchant_number: "", is_active: false,
  });
  useEffect(() => {
    if (data) setF({
      mode: data.mode as any,
      app_key: data.app_key ?? "",
      app_secret: data.app_secret ?? "",
      username: data.username ?? "",
      password: data.password ?? "",
      merchant_number: data.merchant_number ?? "",
      is_active: data.is_active ?? false,
    });
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = { provider, ...f };
      const { error } = await db.from("payment_gateways").upsert(payload, { onConflict: "provider" });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["payment_gateway", provider] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{label}</CardTitle></CardHeader>
      <CardContent className="grid gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Mode</Label>
            <Select value={f.mode} onValueChange={(v) => setF({ ...f, mode: v as any })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sandbox">Sandbox (test)</SelectItem>
                <SelectItem value="live">Live</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Merchant number</Label><Input value={f.merchant_number} onChange={(e) => setF({ ...f, merchant_number: e.target.value })} /></div>
        </div>
        <div><Label>App Key</Label><Input value={f.app_key} onChange={(e) => setF({ ...f, app_key: e.target.value })} /></div>
        <div><Label>App Secret</Label><Input type="password" value={f.app_secret} onChange={(e) => setF({ ...f, app_secret: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Username</Label><Input value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} /></div>
          <div><Label>Password</Label><Input type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></div>
        </div>
        <div className="flex items-center gap-2"><Switch checked={f.is_active} onCheckedChange={(v) => setF({ ...f, is_active: v })} /><Label>Active (customers can pay with this)</Label></div>
        <div><Button onClick={() => save.mutate()} disabled={save.isPending}>Save {label.split(" ")[0]}</Button></div>
      </CardContent>
    </Card>
  );
}
